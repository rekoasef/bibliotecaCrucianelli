import { describe, expect, it } from "vitest";
import { clasificacionFromForm, clasificacionSchema } from "./documentos";

const UUID = "6f1c2a8e-0d4b-4c7e-9a1f-2b3c4d5e6f70";

describe("clasificacionSchema", () => {
  it("lee checkboxes repetidos y vacíos como null", () => {
    const fd = new FormData();
    fd.set("titulo", "  Manual Gringa  ");
    fd.set("tipoId", "");
    fd.set("fechaDocumento", "");
    fd.set("visibilidad", "fabrica");
    fd.append("lineas", UUID);
    fd.append("sistemas", UUID);
    const r = clasificacionSchema.parse(clasificacionFromForm(fd));
    expect(r).toMatchObject({
      titulo: "Manual Gringa",
      tipoId: null,
      fechaDocumento: null,
      visibilidad: "fabrica",
      lineaIds: [UUID],
      modeloIds: [],
      sistemaIds: [UUID],
    });
  });

  it("rechaza fechas inválidas y visibilidades desconocidas", () => {
    expect(
      clasificacionSchema.safeParse({
        visibilidad: "fabrica",
        fechaDocumento: "31/12/2024",
      }).success,
    ).toBe(false);
    expect(
      clasificacionSchema.safeParse({ visibilidad: "todos" }).success,
    ).toBe(false);
  });
});
