// Worker de extracción de texto (docs/02, "Extracción de texto").
// Proceso aparte de la app: toma archivos con estado_extraccion = 'pendiente' de a uno,
// extrae el texto (pdftotext; OCR con Tesseract si es escaneado; export de Google Docs)
// y recalcula el índice de búsqueda del documento.
//
// Corre con: npm run worker  (necesita poppler-utils y tesseract-ocr-spa; ver Dockerfile.worker)
import "dotenv/config";
import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { getDrive } from "@/lib/drive";
import { isGoogleNative, isPdf } from "@/lib/drive/mime";
import { rebuildDocumentSearch } from "@/lib/search/reindex";
import { lastSyncRun, shouldRunNightly, syncDriveChanges } from "./drive-sync";
import { cleanText, needsOcr } from "./text";

const POLL_MS = 5_000;
const OCR_MAX_PAGES = Number(process.env.OCR_MAX_PAGES ?? 80);
const COMMAND_TIMEOUT_MS = 5 * 60_000;
/** Hora (Argentina) a partir de la cual corre la detección de cambios en Drive. */
const SYNC_HOUR = Number(process.env.SYNC_HOUR ?? 3);

type Job = {
  id: string;
  documentoId: string;
  driveFileId: string;
  mimeType: string;
  nombre: string;
};

let stopping = false;

function log(message: string) {
  console.info(`[worker ${new Date().toISOString()}] ${message}`);
}

/** Ejecuta un comando y devuelve su salida estándar. */
function run(command: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { timeout: COMMAND_TIMEOUT_MS });
    const out: Buffer[] = [];
    const err: Buffer[] = [];
    child.stdout.on("data", (d) => out.push(d));
    child.stderr.on("data", (d) => err.push(d));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(Buffer.concat(out).toString("utf8"));
      else
        reject(
          new Error(
            `${command} salió con ${code}: ${Buffer.concat(err).toString().slice(0, 300)}`,
          ),
        );
    });
  });
}

async function pdfPages(file: string) {
  const info = await run("pdfinfo", [file]);
  return Number(/^Pages:\s+(\d+)/m.exec(info)?.[1] ?? 1);
}

/** OCR en español, página por página (lento: docs/02 pide procesar de a uno). */
async function ocr(file: string, dir: string, pages: number) {
  const last = Math.min(pages, OCR_MAX_PAGES);
  const prefix = path.join(dir, "pagina");
  await run("pdftoppm", [
    "-r",
    "200",
    "-gray",
    "-png",
    "-f",
    "1",
    "-l",
    String(last),
    file,
    prefix,
  ]);
  const images = (await readdir(dir))
    .filter((f) => f.startsWith("pagina") && f.endsWith(".png"))
    .sort();
  const textos: string[] = [];
  for (const image of images) {
    textos.push(
      await run("tesseract", [
        path.join(dir, image),
        "-",
        "-l",
        "spa",
        "--psm",
        "3",
      ]),
    );
  }
  return textos.join("\n\n");
}

async function extractPdf(job: Job) {
  const dir = await mkdtemp(path.join(tmpdir(), "extraccion-"));
  try {
    const file = path.join(dir, "archivo.pdf");
    const download = await getDrive().download(job.driveFileId);
    await pipeline(
      Readable.fromWeb(download.body as never),
      createWriteStream(file),
    );

    const pages = await pdfPages(file);
    let text = await run("pdftotext", ["-enc", "UTF-8", "-q", file, "-"]);
    if (needsOcr(text, pages)) {
      log(`${job.nombre}: poco texto (${pages} pág.), aplicando OCR`);
      text = `${text}\n${await ocr(file, dir, pages)}`;
    }
    return text;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function claimJob(): Promise<Job | null> {
  const rows = await db.execute<Job>(sql`
    UPDATE archivos SET estado_extraccion = 'procesando', actualizado_en = now()
    WHERE id = (
      SELECT id FROM archivos
      WHERE estado_extraccion = 'pendiente' AND disponible
      ORDER BY creado_en
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    RETURNING id, documento_id AS "documentoId", drive_file_id AS "driveFileId",
              mime_type AS "mimeType", nombre
  `);
  return rows[0] ?? null;
}

async function processJob(job: Job) {
  const started = Date.now();
  try {
    let raw: string | null = null;
    if (isGoogleNative(job.mimeType))
      raw = await getDrive().exportText(job.driveFileId);
    else if (isPdf(job.mimeType)) raw = await extractPdf(job);

    const text = raw ? cleanText(raw) : "";
    const estado = raw === null ? "no_aplica" : text ? "ok" : "sin_texto";
    await db.execute(sql`
      UPDATE archivos
      SET texto_extraido = ${text || null}, estado_extraccion = ${estado},
          extraccion_error = NULL, actualizado_en = now()
      WHERE id = ${job.id}
    `);
    await rebuildDocumentSearch(job.documentoId);
    log(
      `${job.nombre}: ${estado}, ${text.length} caracteres en ${Date.now() - started} ms`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db.execute(sql`
      UPDATE archivos
      SET estado_extraccion = 'error', extraccion_error = ${message.slice(0, 500)}, actualizado_en = now()
      WHERE id = ${job.id}
    `);
    log(`${job.nombre}: error: ${message}`);
  }
}

async function main() {
  // Trabajos que quedaron a medias (el worker se cortó): vuelven a la cola.
  await db.execute(sql`
    UPDATE archivos SET estado_extraccion = 'pendiente'
    WHERE estado_extraccion = 'procesando' AND actualizado_en < now() - interval '15 minutes'
  `);
  log("esperando archivos para extraer texto");
  let lastSync = (await lastSyncRun())?.ultimaEjecucion ?? null;

  while (!stopping) {
    // Tarea nocturna: detección de cambios en Drive (docs/02).
    if (shouldRunNightly(new Date(), lastSync, SYNC_HOUR)) {
      log("detección de cambios en Drive: empezando");
      try {
        const r = await syncDriveChanges();
        log(`detección de cambios: ${JSON.stringify(r)}`);
      } catch (error) {
        log(
          `detección de cambios falló: ${error instanceof Error ? error.message : error}`,
        );
      }
      lastSync = new Date();
    }

    const job = await claimJob();
    if (job) await processJob(job);
    else await new Promise((r) => setTimeout(r, POLL_MS));
  }
  log("detenido");
  process.exit(0);
}

for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    log(`${signal}: termino el archivo actual y salgo`);
    stopping = true;
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
