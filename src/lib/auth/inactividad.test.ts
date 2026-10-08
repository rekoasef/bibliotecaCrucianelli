import { describe, expect, it } from "vitest";
import { superaInactividad } from "./inactividad";

const DIA = 24 * 60 * 60 * 1000;
const ahora = new Date("2026-10-08T12:00:00Z");
const hace = (dias: number) => new Date(ahora.getTime() - dias * DIA);

describe("superaInactividad", () => {
  it("pausa a quien no usa la app hace más del plazo", () => {
    expect(
      superaInactividad(
        {
          rol: "concesionario",
          ultimaActividad: hace(91),
          ultimoIngreso: hace(200),
        },
        90,
        ahora,
      ),
    ).toBe(true);
  });

  it("cuenta la actividad más reciente (ingreso o uso)", () => {
    expect(
      superaInactividad(
        { rol: "fabrica", ultimaActividad: hace(120), ultimoIngreso: hace(10) },
        90,
        ahora,
      ),
    ).toBe(false);
  });

  it("no pausa al admin, a quien nunca ingresó ni con el plazo en 0", () => {
    const viejo = { ultimaActividad: hace(500), ultimoIngreso: hace(500) };
    expect(superaInactividad({ rol: "admin", ...viejo }, 90, ahora)).toBe(
      false,
    );
    expect(
      superaInactividad(
        { rol: "concesionario", ultimaActividad: null, ultimoIngreso: null },
        90,
        ahora,
      ),
    ).toBe(false);
    expect(
      superaInactividad({ rol: "concesionario", ...viejo }, 0, ahora),
    ).toBe(false);
  });
});
