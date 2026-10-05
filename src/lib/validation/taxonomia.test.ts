import { describe, expect, it } from "vitest";
import { lineaSchema, segmentoSchema } from "./taxonomia";

const SEGMENTO = "6f1c2a8e-0d4b-4c7e-9a1f-2b3c4d5e6f70";

describe("schemas de máquinas", () => {
  it("genera el slug desde el nombre si viene vacío", () => {
    expect(
      segmentoSchema.parse({ nombre: "Granos gruesos", slug: "" }).slug,
    ).toBe("granos-gruesos");
  });

  it("respeta un slug cargado a mano", () => {
    expect(
      segmentoSchema.parse({ nombre: "Granos gruesos", slug: "gruesos" }).slug,
    ).toBe("gruesos");
  });

  it("rechaza slugs con caracteres inválidos", () => {
    expect(
      segmentoSchema.safeParse({ nombre: "X", slug: "con espacio" }).success,
    ).toBe(false);
  });

  it("descripción vacía queda en null", () => {
    const r = lineaSchema.parse({
      nombre: "Gringa",
      descripcion: "  ",
      segmentoId: SEGMENTO,
    });
    expect(r.descripcion).toBeNull();
  });
});
