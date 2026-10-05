import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "./safe-redirect";

describe("safeRedirectPath", () => {
  it("acepta rutas internas", () => {
    expect(safeRedirectPath("/buscar?q=sensor")).toBe("/buscar?q=sensor");
  });

  it.each([
    "//evil.com",
    "/\\evil.com",
    "https://evil.com",
    "evil",
    "",
    null,
    undefined,
  ])("rechaza %s", (target) => {
    expect(safeRedirectPath(target)).toBe("/");
  });
});
