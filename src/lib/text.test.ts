import { describe, expect, it } from "vitest";
import { normalizeTag, slugify } from "./text";

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
