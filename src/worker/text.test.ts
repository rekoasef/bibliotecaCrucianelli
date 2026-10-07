import { describe, expect, it } from "vitest";
import { cleanText, MAX_TEXT_CHARS, mergePages, needsOcr } from "./text";

describe("cleanText", () => {
  it("quita NUL y espacios de sobra, y conserva los saltos de página", () => {
    expect(cleanText("Hola\u0000   mundo\n\n\n\nsigue \f\n fin  \f")).toBe(
      "Hola mundo\n\nsigue\ffin",
    );
  });

  it("una primera página vacía no corre la numeración", () => {
    expect(cleanText(" \n\fpágina dos").split("\f")).toEqual([
      "",
      "página dos",
    ]);
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

describe("mergePages", () => {
  it("suma el OCR a la página que corresponde", () => {
    expect(mergePages("tapa\f\f", ["", "dosificador", "tolva"])).toBe(
      "tapa\fdosificador\ftolva",
    );
  });
});
