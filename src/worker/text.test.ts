import { describe, expect, it } from "vitest";
import { cleanText, MAX_TEXT_CHARS, needsOcr } from "./text";

describe("cleanText", () => {
  it("quita NUL, saltos de página y espacios de sobra", () => {
    expect(cleanText("Hola\u0000   mundo\f\n\n\n\nfin  ")).toBe(
      "Hola mundo\n\nfin",
    );
  });

  it("recorta al máximo", () => {
    expect(cleanText("a".repeat(MAX_TEXT_CHARS + 10))).toHaveLength(
      MAX_TEXT_CHARS,
    );
  });
});

describe("needsOcr", () => {
  it("PDF escaneado (casi sin texto) va a OCR", () => {
    expect(needsOcr("  \n 3 \n", 5)).toBe(true);
  });

  it("PDF con texto no", () => {
    expect(needsOcr("Regulación del dosificador ".repeat(20), 2)).toBe(false);
  });
});
