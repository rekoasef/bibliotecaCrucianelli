/**
 * Tests de normalización de texto.
 *
 * @module
 */

import { describe, expect, it } from "vitest";
import { containsPattern, normalizeTag, slugify } from "./text";

describe("normalizeTag", () => {
  it.each([
    ["Dosificador", "dosificador"],
    ["  Cardán  ", "cardan"],
    ["Rodamiento   cónico", "rodamiento conico"],
    ["Ñandú", "nandu"],
  ])("%s → %s", (input, expected) => {
    expect(normalizeTag(input)).toBe(expected);
  });
});

describe("slugify", () => {
  it.each([
    ["Gringa V", "gringa-v"],
    ["Boletín técnico", "boletin-tecnico"],
    ["Solución de problemas", "solucion-de-problemas"],
    ["Chasis y estructura", "chasis-y-estructura"],
    ["  Plantor 3.0 / Plus ", "plantor-3-0-plus"],
  ])("%s → %s", (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });
});

describe("containsPattern", () => {
  it("escapa los comodines de LIKE", () => {
    expect(containsPattern("sensor")).toBe("%sensor%");
    expect(containsPattern("100%_a\\b")).toBe("%100\\%\\_a\\\\b%");
  });
});
