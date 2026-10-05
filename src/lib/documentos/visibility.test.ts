import { and, inArray } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db";
import {
  documentoLineas,
  documentoModelos,
  documentos,
  lineas,
  modelos,
  segmentos,
  tipos,
  type EstadoDoc,
  type RolUsuario,
  type VisibilidadDoc,
} from "@/db/schema";
import { documentVisibilityFilter } from "./visibility";

// Corre contra la base de desarrollo, dentro de una transacción que se deshace al final.
class Rollback extends Error {}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function withFixture(
  fn: (tx: Tx, f: Awaited<ReturnType<typeof createFixture>>) => Promise<void>,
) {
  try {
    await db.transaction(async (tx) => {
      await fn(tx, await createFixture(tx));
      throw new Rollback();
    });
  } catch (error) {
    if (!(error instanceof Rollback)) throw error;
  }
}

async function createFixture(tx: Tx) {
  const sufijo = crypto.randomUUID().slice(0, 8);
  const [segActivo, segInactivo] = await tx
    .insert(segmentos)
    .values([
      { nombre: `Seg A ${sufijo}`, slug: `seg-a-${sufijo}` },
      { nombre: `Seg B ${sufijo}`, slug: `seg-b-${sufijo}`, activo: false },
    ])
    .returning();
  const [lineaActiva, lineaInactiva, lineaDeSegInactivo] = await tx
    .insert(lineas)
    .values([
      {
        segmentoId: segActivo.id,
        nombre: "Activa",
        slug: `l-activa-${sufijo}`,
      },
      {
        segmentoId: segActivo.id,
        nombre: "Inactiva",
        slug: `l-inactiva-${sufijo}`,
        activo: false,
      },
      {
        segmentoId: segInactivo.id,
        nombre: "En seg inactivo",
        slug: `l-seginact-${sufijo}`,
      },
    ])
    .returning();
  const [modeloActivo, modeloInactivo] = await tx
    .insert(modelos)
    .values([
      {
        lineaId: lineaActiva.id,
        nombre: "M activo",
        slug: `m-activo-${sufijo}`,
      },
      {
        lineaId: lineaActiva.id,
        nombre: "M inactivo",
        slug: `m-inactivo-${sufijo}`,
        activo: false,
      },
    ])
    .returning();
  const [tipo] = await tx
    .insert(tipos)
    .values({ nombre: `Tipo ${sufijo}`, slug: `tipo-${sufijo}` })
    .returning();

  const ids: Record<string, string> = {};
  async function doc(
    key: string,
    estado: EstadoDoc,
    visibilidad: VisibilidadDoc,
    maquinas: { lineas?: string[]; modelos?: string[] },
  ) {
    const [d] = await tx
      .insert(documentos)
      .values({ titulo: key, tipoId: tipo.id, estado, visibilidad })
      .returning({ id: documentos.id });
    ids[key] = d.id;
    for (const lineaId of maquinas.lineas ?? []) {
      await tx
        .insert(documentoLineas)
        .values({ documentoId: d.id, itemId: lineaId });
    }
    for (const modeloId of maquinas.modelos ?? []) {
      await tx
        .insert(documentoModelos)
        .values({ documentoId: d.id, itemId: modeloId });
    }
  }

  const activa = { lineas: [lineaActiva.id] };
  await doc("vigente-conc", "vigente", "concesionarios", activa);
  await doc("obsoleto-conc", "obsoleto", "concesionarios", activa);
  await doc("vigente-fab", "vigente", "fabrica", activa);
  await doc("borrador-conc", "borrador", "concesionarios", activa);
  await doc("modelo-activo", "vigente", "concesionarios", {
    modelos: [modeloActivo.id],
  });
  await doc("solo-modelo-inactivo", "vigente", "concesionarios", {
    modelos: [modeloInactivo.id],
  });
  await doc("solo-linea-inactiva", "vigente", "concesionarios", {
    lineas: [lineaInactiva.id],
  });
  await doc("solo-segmento-inactivo", "vigente", "concesionarios", {
    lineas: [lineaDeSegInactivo.id],
  });
  await doc("inactiva-y-activa", "vigente", "concesionarios", {
    lineas: [lineaInactiva.id],
    modelos: [modeloActivo.id],
  });
  await doc("sin-maquinas", "vigente", "concesionarios", {});

  return { ids };
}

async function visibles(tx: Tx, rol: RolUsuario, ids: Record<string, string>) {
  const rows = await tx
    .select({ titulo: documentos.titulo })
    .from(documentos)
    .where(
      and(
        inArray(documentos.id, Object.values(ids)),
        documentVisibilityFilter({ rol }),
      ),
    );
  return rows.map((r) => r.titulo).sort();
}

describe("documentVisibilityFilter", () => {
  it("admin ve todo, incluidos borradores y máquinas inactivas", async () => {
    await withFixture(async (tx, { ids }) => {
      expect(await visibles(tx, "admin", ids)).toEqual(Object.keys(ids).sort());
    });
  });

  it("fábrica ve vigentes y obsoletos de ambas visibilidades, no borradores", async () => {
    await withFixture(async (tx, { ids }) => {
      expect(await visibles(tx, "fabrica", ids)).toEqual(
        [
          "inactiva-y-activa",
          "modelo-activo",
          "obsoleto-conc",
          "vigente-conc",
          "vigente-fab",
        ].sort(),
      );
    });
  });

  it("concesionario no ve documentos 'Solo fábrica' ni borradores", async () => {
    await withFixture(async (tx, { ids }) => {
      expect(await visibles(tx, "concesionario", ids)).toEqual(
        [
          "inactiva-y-activa",
          "modelo-activo",
          "obsoleto-conc",
          "vigente-conc",
        ].sort(),
      );
    });
  });

  it("oculta documentos asociados solo a máquinas inactivas (modelo, línea o segmento)", async () => {
    await withFixture(async (tx, { ids }) => {
      for (const rol of ["fabrica", "concesionario"] as const) {
        const v = await visibles(tx, rol, ids);
        expect(v).not.toContain("solo-modelo-inactivo");
        expect(v).not.toContain("solo-linea-inactiva");
        expect(v).not.toContain("solo-segmento-inactivo");
        expect(v).not.toContain("sin-maquinas");
      }
    });
  });
});
