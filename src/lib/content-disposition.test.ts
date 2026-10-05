import { describe, expect, it } from "vitest";
import { contentDisposition } from "./content-disposition";

describe("contentDisposition", () => {
  it("incluye fallback ASCII y nombre UTF-8", () => {
    expect(contentDisposition("attachment", 'Regulación "Gringa".pdf')).toBe(
      `attachment; filename="Regulacion _Gringa_.pdf"; filename*=UTF-8''Regulaci%C3%B3n%20%22Gringa%22.pdf`,
    );
  });
});
