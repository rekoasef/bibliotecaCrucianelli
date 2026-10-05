import { describe, expect, it } from "vitest";
import { parseRange } from "./range";

describe("parseRange", () => {
  it.each([
    ["bytes=0-99", { start: 0, end: 99 }],
    ["bytes=100-", { start: 100, end: 999 }],
    ["bytes=-100", { start: 900, end: 999 }],
    ["bytes=900-5000", { start: 900, end: 999 }],
  ])("%s", (header, expected) => {
    expect(parseRange(header, 1000)).toEqual(expected);
  });

  it("sin cabecera o con varios rangos: archivo completo", () => {
    expect(parseRange(null, 1000)).toBeNull();
    expect(parseRange("bytes=0-1,5-6", 1000)).toBeNull();
  });

  it("rangos imposibles: 416", () => {
    expect(parseRange("bytes=1000-", 1000)).toBe("invalid");
    expect(parseRange("bytes=50-10", 1000)).toBe("invalid");
  });
});
