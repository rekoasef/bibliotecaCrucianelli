import { describe, expect, it } from "vitest";
import {
  canDisplayInline,
  defaultModoAcceso,
  formatBytes,
  initialEstadoExtraccion,
  titleFromFileName,
} from "./mime";

describe("mime", () => {
  it("videos públicos, el resto por servidor", () => {
    expect(defaultModoAcceso("video/mp4")).toBe("publico");
    expect(defaultModoAcceso("application/pdf")).toBe("servidor");
    expect(defaultModoAcceso("image/png")).toBe("servidor");
  });

  it("extrae texto solo de PDFs y Google Docs", () => {
    expect(initialEstadoExtraccion("application/pdf")).toBe("pendiente");
    expect(
      initialEstadoExtraccion("application/vnd.google-apps.document"),
    ).toBe("pendiente");
    expect(initialEstadoExtraccion("video/mp4")).toBe("no_aplica");
    expect(initialEstadoExtraccion("image/jpeg")).toBe("no_aplica");
  });

  it("no muestra inline tipos que pueden ejecutar scripts", () => {
    expect(canDisplayInline("application/pdf")).toBe(true);
    expect(canDisplayInline("text/html")).toBe(false);
    expect(canDisplayInline("image/svg+xml")).toBe(false);
  });

  it("título desde el nombre del archivo", () => {
    expect(titleFromFileName("Regulacion_dosificador_Gringa V.pdf")).toBe(
      "Regulacion dosificador Gringa V",
    );
    expect(titleFromFileName("Despiece 2024")).toBe("Despiece 2024");
  });

  it("formatea tamaños", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2.5 * 1024 * 1024)).toBe("2,5 MB");
    expect(formatBytes(null)).toBe("");
  });
});
