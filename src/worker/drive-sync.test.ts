import { describe, expect, it } from "vitest";
import { decideSync, shouldRunNightly } from "./drive-sync";

const ayer = new Date("2026-10-04T12:00:00Z");
const hoy = new Date("2026-10-05T12:00:00Z");

describe("decideSync", () => {
  it("borrado o sin acceso → no disponible", () => {
    expect(
      decideSync({ disponible: true, driveModificadoEn: ayer }, null),
    ).toBe("no-disponible");
    expect(
      decideSync(
        { disponible: true, driveModificadoEn: ayer },
        { trashed: true, modifiedTime: ayer },
      ),
    ).toBe("no-disponible");
  });

  it("volvió a estar accesible → recuperado", () => {
    expect(
      decideSync(
        { disponible: false, driveModificadoEn: ayer },
        { trashed: false, modifiedTime: ayer },
      ),
    ).toBe("recuperado");
  });

  it("modifiedTime más nuevo → cambiado; igual → nada", () => {
    expect(
      decideSync(
        { disponible: true, driveModificadoEn: ayer },
        { trashed: false, modifiedTime: hoy },
      ),
    ).toBe("cambiado");
    expect(
      decideSync(
        { disponible: true, driveModificadoEn: hoy },
        { trashed: false, modifiedTime: hoy },
      ),
    ).toBe("igual");
  });
});

describe("shouldRunNightly (hora de Argentina, UTC-3)", () => {
  it("no corre antes de la hora", () => {
    expect(shouldRunNightly(new Date("2026-10-05T05:00:00Z"), null, 3)).toBe(
      false,
    ); // 02:00 AR
  });

  it("corre una vez por día desde la hora", () => {
    const tresYMedia = new Date("2026-10-05T06:30:00Z"); // 03:30 AR
    expect(shouldRunNightly(tresYMedia, ayer, 3)).toBe(true);
    expect(
      shouldRunNightly(tresYMedia, new Date("2026-10-05T06:05:00Z"), 3),
    ).toBe(false);
  });
});
