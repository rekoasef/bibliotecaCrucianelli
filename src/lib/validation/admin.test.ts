import { describe, expect, it } from "vitest";
import { usuarioSchema } from "./admin";

const CONCESIONARIO = "6f1c2a8e-0d4b-4c7e-9a1f-2b3c4d5e6f70";

describe("usuarioSchema", () => {
  it("normaliza el email a minúsculas", () => {
    const r = usuarioSchema.parse({
      nombre: "Ana",
      email: " Ana@Taller.COM ",
      rol: "fabrica",
    });
    expect(r.email).toBe("ana@taller.com");
  });

  it("exige concesionario para el rol concesionario", () => {
    const r = usuarioSchema.safeParse({
      nombre: "Juan",
      email: "j@x.com",
      rol: "concesionario",
    });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].path).toEqual(["concesionarioId"]);
  });

  it("descarta el concesionario si el rol no es concesionario", () => {
    const r = usuarioSchema.parse({
      nombre: "Ana",
      email: "a@x.com",
      rol: "fabrica",
      concesionarioId: CONCESIONARIO,
    });
    expect(r.concesionarioId).toBeNull();
  });

  it("acepta un mecánico de concesionario", () => {
    const r = usuarioSchema.parse({
      nombre: "Juan",
      email: "j@x.com",
      rol: "concesionario",
      concesionarioId: CONCESIONARIO,
    });
    expect(r.concesionarioId).toBe(CONCESIONARIO);
  });

  it("rechaza roles desconocidos", () => {
    expect(
      usuarioSchema.safeParse({ nombre: "X", email: "x@x.com", rol: "root" })
        .success,
    ).toBe(false);
  });
});
