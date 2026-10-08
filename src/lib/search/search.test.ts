import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db";
import {
  archivos,
  busquedas,
  documentoEtiquetas,
  documentoLineas,
  documentoModelos,
  documentoProductos,
  documentoSistemas,
  documentos,
  etiquetas,
  lineas,
  modelos,
  productos,
  segmentos,
  sistemas,
  tipos,
  usuarios,
  type EstadoDoc,
} from "@/db/schema";
import type { RolLector } from "@/lib/documentos/visibility";
import { normalizeTag } from "@/lib/text";
import { rebuildDocumentSearch } from "./reindex";
import {
  queryWords,
  recentSearches,
  searchDocuments,
  type SearchFilters,
} from "./search";

// Contra Postgres real (configuración es_unaccent, pg_trgm), dentro de una
// transacción que se deshace al final.
class Rollback extends Error {}
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function withFixture(fn: (tx: Tx, f: Fixture) => Promise<void>) {
  try {
    await db.transaction(async (tx) => {
      await fn(tx, await createFixture(tx));
      throw new Rollback();
    });
  } catch (error) {
    if (!(error instanceof Rollback)) throw error;
  }
}

type Fixture = Awaited<ReturnType<typeof createFixture>>;

async function createFixture(tx: Tx) {
  const x = crypto.randomUUID().slice(0, 6);
  // Palabras inventadas (solo letras, para que entren al vocabulario) que no
  // existen fuera del fixture.
  const letras = x.replace(/[0-9]/g, (d) => "ghijklmnop"[Number(d)]);
  const palabraPdf = `tornillo${letras}`;
  const palabraFabrica = `rodamiento${letras}`;
  const [seg] = await tx
    .insert(segmentos)
    .values({ nombre: `Gruesos ${x}`, slug: `gruesos-${x}` })
    .returning();
  // Nombres reales para probar el texto; los slugs llevan sufijo para no chocar con el seed.
  const [gringa, plantor] = await tx
    .insert(lineas)
    .values([
      { segmentoId: seg.id, nombre: "Gringa", slug: `gringa-${x}` },
      { segmentoId: seg.id, nombre: "Plantor", slug: `plantor-${x}` },
    ])
    .returning();
  const [gringaV] = await tx
    .insert(modelos)
    .values([{ lineaId: gringa.id, nombre: "Gringa V", slug: `gringa-v-${x}` }])
    .returning();
  const [instructivo, despiece] = await tx
    .insert(tipos)
    .values([
      { nombre: `Instructivo ${x}`, slug: `instructivo-${x}` },
      { nombre: `Despiece ${x}`, slug: `despiece-${x}` },
    ])
    .returning();
  const [dosificacion] = await tx
    .insert(sistemas)
    .values({ nombre: `Dosificación ${x}`, slug: `dosificacion-${x}` })
    .returning();
  const [tecnologia] = await tx
    .insert(productos)
    .values({ nombre: `Tecnologíax ${x}`, slug: `tecnologia-${x}` })
    .returning();
  const [sensor] = await tx
    .insert(etiquetas)
    .values({
      nombre: `sensor ${x}`,
      nombreNormalizado: normalizeTag(`sensor ${x}`),
    })
    .returning();

  const ids: Record<string, string> = {};
  async function doc(
    key: string,
    data: {
      titulo: string;
      tipoId: string;
      estado?: EstadoDoc;
      /** Para quién está marcado (fábrica ve todo). Default: concesionarios. */
      publico?: "conc" | "fab" | "cli" | "conc+cli";
      descripcion?: string;
      texto?: string;
      lineas?: string[];
      modelos?: string[];
      sistemas?: string[];
      productos?: string[];
      etiquetas?: string[];
    },
  ) {
    const [d] = await tx
      .insert(documentos)
      .values({
        titulo: data.titulo,
        tipoId: data.tipoId,
        descripcion: data.descripcion,
        estado: data.estado ?? "vigente",
        visibleConcesionarios: (data.publico ?? "conc").includes("conc"),
        visibleClientes: (data.publico ?? "conc").includes("cli"),
        publicadoEn: new Date(),
      })
      .returning({ id: documentos.id });
    ids[key] = d.id;
    for (const id of data.lineas ?? [])
      await tx
        .insert(documentoLineas)
        .values({ documentoId: d.id, itemId: id });
    for (const id of data.modelos ?? [])
      await tx
        .insert(documentoModelos)
        .values({ documentoId: d.id, itemId: id });
    for (const id of data.sistemas ?? [])
      await tx
        .insert(documentoSistemas)
        .values({ documentoId: d.id, itemId: id });
    for (const id of data.productos ?? [])
      await tx
        .insert(documentoProductos)
        .values({ documentoId: d.id, itemId: id });
    for (const id of data.etiquetas ?? [])
      await tx
        .insert(documentoEtiquetas)
        .values({ documentoId: d.id, itemId: id });
    if (data.texto) {
      const [archivo] = await tx
        .insert(archivos)
        .values({
          documentoId: d.id,
          driveFileId: `test-${crypto.randomUUID()}`,
          nombre: "archivo.pdf",
          mimeType: "application/pdf",
          textoExtraido: data.texto,
          estadoExtraccion: "ok",
        })
        .returning({ id: archivos.id });
      await tx.execute(sql`SELECT rebuild_archivo_paginas(${archivo.id})`);
    }
    await rebuildDocumentSearch(d.id, tx);
  }

  await doc("regulacion", {
    titulo: "Regulación del dosificador",
    tipoId: instructivo.id,
    lineas: [gringa.id],
    sistemas: [dosificacion.id],
  });
  await doc("calibracion", {
    titulo: "Calibración de siembra",
    tipoId: instructivo.id,
    lineas: [plantor.id],
    etiquetas: [sensor.id],
  });
  await doc("despieceGringa", {
    titulo: "Despiece tren de siembra",
    tipoId: despiece.id,
    modelos: [gringaV.id],
  });
  // Sin máquina: solo producto, para clientes y concesionarios.
  await doc("monitor", {
    titulo: "Monitor de siembra: configuración",
    tipoId: instructivo.id,
    productos: [tecnologia.id],
    publico: "conc+cli",
  });
  await doc("enElTexto", {
    titulo: "Manual general",
    tipoId: instructivo.id,
    lineas: [plantor.id],
    // Tres páginas (separadas con \f, como las deja el worker).
    texto: `Índice.\fPara la regulación del dosificador ver la tabla 4.\fAjustar el ${palabraPdf} del dosificador.`,
  });
  await doc("obsoleto", {
    titulo: "Regulación del dosificador (edición 2019)",
    tipoId: instructivo.id,
    estado: "obsoleto",
    lineas: [gringa.id],
  });
  await doc("soloFabrica", {
    titulo: "Plano del dosificador",
    tipoId: despiece.id,
    publico: "fab",
    lineas: [gringa.id],
    descripcion: `Cambio del ${palabraFabrica}.`,
  });
  await doc("borrador", {
    titulo: "Regulación dosificador borrador",
    tipoId: instructivo.id,
    estado: "borrador",
    lineas: [gringa.id],
  });

  return {
    ids,
    x,
    palabraPdf,
    palabraFabrica,
    slugs: {
      gringa: gringa.slug,
      gringaV: gringaV.slug,
      plantor: plantor.slug,
      despiece: despiece.slug,
      dosificacion: dosificacion.slug,
      tecnologia: tecnologia.slug,
    },
  };
}

async function buscar(
  tx: Tx,
  f: Fixture,
  filters: SearchFilters,
  rol: Exclude<RolLector, "admin"> = "concesionario",
) {
  // Acotado a los documentos del fixture (la base de desarrollo puede tener otros).
  const { results } = await searchDocuments(filters, { rol }, 50, tx);
  const propios = new Map(Object.entries(f.ids).map(([k, v]) => [v, k]));
  return results
    .filter((r) => propios.has(r.id))
    .map((r) => propios.get(r.id)!);
}

describe("searchDocuments", () => {
  it('"regulacion dosificador" encuentra sin acentos; título antes que texto del PDF', async () => {
    await withFixture(async (tx, f) => {
      const r = await buscar(tx, f, { q: "regulacion dosificador" });
      expect(r[0]).toBe("regulacion");
      expect(r).toContain("enElTexto");
    });
  });

  it("obsoletos no aparecen por defecto; con el filtro, después de los vigentes", async () => {
    await withFixture(async (tx, f) => {
      expect(
        await buscar(tx, f, { q: "regulacion dosificador" }),
      ).not.toContain("obsoleto");
      const r = await buscar(tx, f, {
        q: "regulacion dosificador",
        obsoletos: true,
      });
      expect(r.indexOf("obsoleto")).toBeGreaterThan(r.indexOf("regulacion"));
      expect(r.at(-1)).toBe("obsoleto");
    });
  });

  it('"sensr" tolera el error de tipeo por la etiqueta "sensor"', async () => {
    await withFixture(async (tx, f) => {
      expect(await buscar(tx, f, { q: `sensr ${f.x}` })).toContain(
        "calibracion",
      );
    });
  });

  it('"gringa v despiece" encuentra el despiece del modelo', async () => {
    await withFixture(async (tx, f) => {
      expect((await buscar(tx, f, { q: "gringa v despiece" }))[0]).toBe(
        "despieceGringa",
      );
    });
  });

  it("filtro por modelo incluye lo asociado a su línea completa", async () => {
    await withFixture(async (tx, f) => {
      const r = await buscar(tx, f, { modelo: f.slugs.gringaV });
      expect(r).toEqual(
        expect.arrayContaining(["despieceGringa", "regulacion"]),
      );
      expect(r).not.toContain("calibracion");
    });
  });

  it("filtro por línea incluye lo asociado a sus modelos", async () => {
    await withFixture(async (tx, f) => {
      const r = await buscar(tx, f, { linea: f.slugs.gringa });
      expect(r).toEqual(
        expect.arrayContaining(["despieceGringa", "regulacion"]),
      );
      expect(r).not.toContain("enElTexto");
    });
  });

  it("combina texto y filtros (tipo, sistema)", async () => {
    await withFixture(async (tx, f) => {
      expect(
        await buscar(tx, f, { q: "siembra", tipo: f.slugs.despiece }),
      ).toEqual(["despieceGringa"]);
      expect(await buscar(tx, f, { sistema: f.slugs.dosificacion })).toEqual([
        "regulacion",
      ]);
    });
  });

  it("respeta la visibilidad: concesionario no ve Solo fábrica ni borradores", async () => {
    await withFixture(async (tx, f) => {
      const conc = await buscar(tx, f, { q: "dosificador" });
      expect(conc).not.toContain("soloFabrica");
      expect(conc).not.toContain("borrador");
      expect(await buscar(tx, f, { q: "dosificador" }, "fabrica")).toContain(
        "soloFabrica",
      );
    });
  });

  it("cliente final (sin cuenta) solo encuentra lo marcado para clientes", async () => {
    await withFixture(async (tx, f) => {
      expect(await buscar(tx, f, { q: "siembra" }, "cliente")).toEqual([
        "monitor",
      ]);
      expect(await buscar(tx, f, { q: "dosificador" }, "cliente")).toEqual([]);
    });
  });

  it("filtra por producto y encuentra por el nombre del producto", async () => {
    await withFixture(async (tx, f) => {
      expect(
        await buscar(tx, f, { producto: f.slugs.tecnologia }, "fabrica"),
      ).toEqual(["monitor"]);
      expect(await buscar(tx, f, { q: `tecnologiax ${f.x}` })).toContain(
        "monitor",
      );
    });
  });

  it("resalta con marcadores (no HTML) y usa el texto del PDF si no hay descripción", async () => {
    await withFixture(async (tx, f) => {
      const { results } = await searchDocuments(
        { q: "regulacion dosificador" },
        { rol: "fabrica" },
        50,
        tx,
      );
      const r = results.find((x) => x.id === f.ids.enElTexto)!;
      expect(r.snippet).toContain("\u0001");
      expect(r.snippet).toContain("ver la tabla");
      expect(r.snippet).not.toContain("<b>");
    });
  });

  it("indica en qué páginas del PDF aparece lo buscado", async () => {
    await withFixture(async (tx, f) => {
      const paginasDe = async (q: string) =>
        (
          await searchDocuments({ q }, { rol: "concesionario" }, 50, tx)
        ).results.find((r) => r.id === f.ids.enElTexto)?.paginas;
      expect(await paginasDe("regulacion dosificador")).toEqual([
        { nombre: "archivo.pdf", paginas: [2], mas: 0 },
      ]);
      expect(await paginasDe("dosificador")).toEqual([
        { nombre: "archivo.pdf", paginas: [2, 3], mas: 0 },
      ]);
      // Lo encontrado solo por el título no tiene páginas.
      expect(await paginasDe("manual general")).toBeNull();
    });
  });

  it("corrige errores de tipeo con palabras del texto del PDF", async () => {
    await withFixture(async (tx, f) => {
      // "tornillo…" → "tornllo…" (una letra menos), con otra palabra con acento.
      const q = `Regulación ${f.palabraPdf.replace("tornillo", "tornllo")}`;
      const { results, correccion } = await searchDocuments(
        { q },
        { rol: "concesionario" },
        50,
        tx,
      );
      expect(correccion).toBe(`Regulación ${f.palabraPdf}`);
      expect(results.map((r) => r.id)).toContain(f.ids.enElTexto);
    });
  });

  it("no corrige con palabras de documentos que el usuario no puede ver", async () => {
    await withFixture(async (tx, f) => {
      const q = f.palabraFabrica.replace("rodamiento", "rodamento");
      const conc = await searchDocuments(
        { q },
        { rol: "concesionario" },
        50,
        tx,
      );
      expect(conc.correccion).toBeUndefined();
      expect(conc.results.map((r) => r.id)).not.toContain(f.ids.soloFabrica);

      const fab = await searchDocuments({ q }, { rol: "fabrica" }, 50, tx);
      expect(fab.correccion).toBe(f.palabraFabrica);
      expect(fab.results.map((r) => r.id)).toContain(f.ids.soloFabrica);
    });
  });

  it("no corrige si la búsqueda ya encuentra resultados", async () => {
    await withFixture(async (tx, f) => {
      const { correccion } = await searchDocuments(
        { q: f.palabraPdf },
        { rol: "concesionario" },
        50,
        tx,
      );
      expect(correccion).toBeUndefined();
    });
  });
});

describe("queryWords", () => {
  it("normaliza como el vocabulario y descarta palabras cortas y números", () => {
    expect(queryWords("Dosificación de la tolva 2024 tolva")).toEqual([
      "dosificacion",
      "tolva",
    ]);
  });
});

describe("recentSearches", () => {
  it("últimas búsquedas con resultados, sin repetir, la más reciente primero", async () => {
    await withFixture(async (tx) => {
      const [u] = await tx
        .insert(usuarios)
        .values({
          nombre: "Prueba",
          email: `prueba-${crypto.randomUUID()}@example.com`,
          rol: "fabrica",
        })
        .returning({ id: usuarios.id });
      const base = Date.now() - 60_000;
      const buscadas: [string, number][] = [
        ["tolva", 3],
        ["Dosificación", 2],
        ["sin nada", 0],
        ["dosificacion", 4],
        ["sensor", 1],
      ];
      await tx.insert(busquedas).values(
        buscadas.map(([texto, cantidad], i) => ({
          usuarioId: u.id,
          texto,
          cantidadResultados: cantidad,
          creadoEn: new Date(base + i * 1000),
        })),
      );
      expect(await recentSearches(u.id, 5, tx)).toEqual([
        "sensor",
        "dosificacion",
        "tolva",
      ]);
    });
  });
});
