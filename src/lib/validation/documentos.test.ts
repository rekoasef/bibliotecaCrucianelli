import { describe, expect, it } from "vitest";
import { clasificacionFromForm, clasificacionSchema } from "./documentos";

const UUID = "6f1c2a8e-0d4b-4c7e-9a1f-2b3c4d5e6f70";

describe("clasificacionSchema", () => {
  it("lee checkboxes repetidos y vacíos como null", () => {
    const fd = new FormData();
    fd.set("titulo", "  Manual Gringa  ");
    fd.set("tipoId", "");
    fd.set("fechaDocumento", "");
    fd.append("publicos", "concesionarios");
    fd.append("publicos", "clientes");
    fd.append("lineas", UUID);
    fd.append("productos", UUID);
    fd.append("sistemas", UUID);
    const r = clasificacionSchema.parse(clasificacionFromForm(fd));
    expect(r).toMatchObject({
      titulo: "Manual Gringa",
      tipoId: null,
      fechaDocumento: null,
      visibleConcesionarios: true,
      visibleClientes: true,
      lineaIds: [UUID],
      modeloIds: [],
      sistemaIds: [UUID],
      productoIds: [UUID],
    });
  });

  it("sin casillas de público queda Solo fábrica", () => {
    const r = clasificacionSchema.parse(clasificacionFromForm(new FormData()));
    expect(r).toMatchObject({
      visibleConcesionarios: false,
      visibleClientes: false,
    });
  });

  it("rechaza fechas inválidas", () => {
    expect(
      clasificacionSchema.safeParse({ fechaDocumento: "31/12/2024" }).success,
    ).toBe(false);
  });
});
