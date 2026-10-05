import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { fakeDriveId, startFakeDrive } from "@/test/fake-drive-server";
import { filenameFromDisposition, PublicLinkDriveClient } from "./public";
import { DriveNotFoundError, DriveRangeError } from "./types";

let server: Server;
let client: PublicLinkDriveClient;
const contenido = Buffer.from("%PDF-1.4 " + "x".repeat(1000));

beforeAll(async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "drive-publico-"));
  await mkdir(path.join(dir, "Privado"));
  await writeFile(path.join(dir, "Regulación dosificador.pdf"), contenido);
  await writeFile(path.join(dir, "Privado", "plano.pdf"), contenido);
  const fake = await startFakeDrive(dir);
  server = fake.server;
  client = new PublicLinkDriveClient(fake.url);
});

afterAll(() => {
  server.close();
});

describe("PublicLinkDriveClient", () => {
  it("lee nombre, tipo y tamaño de las cabeceras", async () => {
    const item = await client.getItem(
      fakeDriveId("Regulación dosificador.pdf"),
    );
    expect(item).toMatchObject({
      name: "Regulación dosificador.pdf",
      mimeType: "application/pdf",
      size: contenido.length,
      isFolder: false,
    });
    expect(item?.modifiedTime).toBeInstanceOf(Date);
  });

  it("un archivo no compartido (HTML de Google) no es accesible", async () => {
    expect(await client.getItem(fakeDriveId("Privado/plano.pdf"))).toBeNull();
    await expect(
      client.download(fakeDriveId("Privado/plano.pdf")),
    ).rejects.toBeInstanceOf(DriveNotFoundError);
    expect(await client.getItem("pub_noexiste")).toBeNull();
  });

  it("descarga completa y por rango", async () => {
    const id = fakeDriveId("Regulación dosificador.pdf");
    const full = await client.download(id);
    expect(full.status).toBe(200);
    expect(Buffer.from(await new Response(full.body).arrayBuffer())).toEqual(
      contenido,
    );

    const part = await client.download(id, { range: "bytes=0-8" });
    expect(part.status).toBe(206);
    expect(part.contentRange).toBe(`bytes 0-8/${contenido.length}`);
    expect(
      Buffer.from(await new Response(part.body).arrayBuffer()).toString(),
    ).toBe("%PDF-1.4 ");

    await expect(
      client.download(id, { range: "bytes=999999-" }),
    ).rejects.toBeInstanceOf(DriveRangeError);
  });

  it("no lista carpetas", async () => {
    expect(client.browsable).toBe(false);
    expect(await client.rootIds()).toEqual([]);
  });
});

describe("filenameFromDisposition", () => {
  it("prefiere filename* en UTF-8", () => {
    expect(
      filenameFromDisposition(
        `attachment; filename="Regulacion.pdf"; filename*=UTF-8''Regulaci%C3%B3n.pdf`,
      ),
    ).toBe("Regulación.pdf");
  });

  it("corrige el UTF-8 leído como Latin-1 (como lo manda Google)", () => {
    const comoLlega = Buffer.from(
      'attachment; filename="INSTRUCTIVO INSTALACIÓN BXM.pdf"',
      "utf8",
    ).toString("latin1");
    expect(filenameFromDisposition(comoLlega)).toBe(
      "INSTRUCTIVO INSTALACIÓN BXM.pdf",
    );
    // Un nombre Latin-1 legítimo no se toca
    expect(
      filenameFromDisposition('attachment; filename="Calibración.pdf"'),
    ).toBe("Calibración.pdf");
  });

  it("usa filename si no hay filename*", () => {
    expect(
      filenameFromDisposition('attachment; filename="Manual Gringa.pdf"'),
    ).toBe("Manual Gringa.pdf");
    expect(filenameFromDisposition(null)).toBeNull();
  });
});
