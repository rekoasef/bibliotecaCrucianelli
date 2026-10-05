// Servidor que imita drive.usercontent.google.com/download para pruebas
// (tests de PublicLinkDriveClient y e2e). Sirve los archivos de una carpeta;
// el ID es "pub_" + la ruta relativa en base64url. Lo que esté bajo "Privado/"
// responde como un archivo no compartido (404 con HTML, como Google).
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import path from "node:path";

const MIME: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".mp4": "video/mp4",
  ".html": "text/html",
};

export function fakeDriveId(relPath: string) {
  return `pub_${Buffer.from(relPath).toString("base64url")}`;
}

export function startFakeDrive(
  dir: string,
  port = 0,
): Promise<{ server: Server; url: string }> {
  const base = path.resolve(dir);
  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const id = url.searchParams.get("id") ?? "";
    const notFound = () => {
      res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      res.end("<html><title>Error 404 (Not Found)!!1</title></html>");
    };
    if (url.pathname !== "/download" || !id.startsWith("pub_"))
      return notFound();

    const rel = Buffer.from(id.slice(4), "base64url").toString();
    const abs = path.resolve(base, rel);
    if (!abs.startsWith(base + path.sep) || rel.startsWith("Privado/"))
      return notFound();
    const info = await stat(abs).catch(() => null);
    if (!info?.isFile()) return notFound();

    const name = path.basename(abs);
    const headers: Record<string, string> = {
      "Content-Type":
        MIME[path.extname(abs).toLowerCase()] ?? "application/octet-stream",
      "Content-Disposition": `attachment; filename="${name.normalize("NFD").replace(/[^\x20-\x7e]/g, "")}"; filename*=UTF-8''${encodeURIComponent(name)}`,
      "Last-Modified": info.mtime.toUTCString(),
      "Accept-Ranges": "bytes",
    };
    const m = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range ?? "");
    if (m) {
      const start = Number(m[1]);
      const end = m[2] ? Math.min(Number(m[2]), info.size - 1) : info.size - 1;
      if (start >= info.size) {
        res.writeHead(416, { "Content-Range": `bytes */${info.size}` });
        return res.end();
      }
      res.writeHead(206, {
        ...headers,
        "Content-Length": String(end - start + 1),
        "Content-Range": `bytes ${start}-${end}/${info.size}`,
      });
      return createReadStream(abs, { start, end }).pipe(res);
    }
    res.writeHead(200, { ...headers, "Content-Length": String(info.size) });
    createReadStream(abs).pipe(res);
  });

  return new Promise((resolve) => {
    server.listen(port, "127.0.0.1", () => {
      const address = server.address();
      const p = typeof address === "object" && address ? address.port : port;
      resolve({ server, url: `http://127.0.0.1:${p}` });
    });
  });
}

// Uso directo (e2e): tsx src/test/fake-drive-server.ts <carpeta> <puerto>
if (process.argv[1]?.endsWith("fake-drive-server.ts") && process.argv[2]) {
  void startFakeDrive(process.argv[2], Number(process.argv[3] ?? 4555)).then(
    ({ url }) => console.info(`Drive simulado en ${url}`),
  );
}
