import { describe, expect, it } from "vitest";
import { parseDriveLink, parseDriveLinks } from "./links";

const ID = "1AbCdEfGhIjKlMnOpQrStUvWxYz_-123";

describe("parseDriveLink", () => {
  it.each([
    [`https://drive.google.com/file/d/${ID}/view?usp=sharing`, "file"],
    [`https://drive.google.com/open?id=${ID}`, "file"],
    [`https://drive.google.com/uc?id=${ID}&export=download`, "file"],
    [`https://docs.google.com/document/d/${ID}/edit`, "native"],
    [`https://docs.google.com/spreadsheets/d/${ID}/edit#gid=0`, "native"],
    [`https://drive.google.com/drive/folders/${ID}?usp=drive_link`, "folder"],
    [`https://drive.google.com/drive/u/1/folders/${ID}`, "folder"],
    [`drive.google.com/file/d/${ID}/view`, "file"],
    [ID, "file"],
  ])("%s", (link, kind) => {
    expect(parseDriveLink(link)).toEqual({ kind, id: ID });
  });

  it("rechaza lo que no es de Drive", () => {
    expect(parseDriveLink(`https://evil.com/file/d/${ID}/view`)).toBeNull();
    expect(parseDriveLink("hola")).toBeNull();
    expect(
      parseDriveLink("https://drive.google.com/drive/my-drive"),
    ).toBeNull();
  });
});

describe("parseDriveLinks", () => {
  it("varios links por línea y reporta los inválidos", () => {
    const r = parseDriveLinks(
      `https://drive.google.com/file/d/${ID}/view\n\nno-es-link\n${ID}X`,
    );
    expect(r.ok).toHaveLength(2);
    expect(r.invalidos).toEqual(["no-es-link"]);
  });
});
