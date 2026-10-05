import "server-only";
import { createReadStream } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { FOLDER_MIME, mimeFromName } from "./mime";
import { parseRange } from "./range";
import {
  DriveNotFoundError,
  DriveRangeError,
  type DriveClient,
  type DriveDownload,
  type DriveItem,
} from "./types";

/**
 * Drive simulado sobre una carpeta local (DRIVE_LOCAL_DIR), para desarrollar y
 * probar sin credenciales. Cada subcarpeta de primer nivel es una carpeta raíz.
 * Los IDs codifican la ruta relativa; nunca se sale de la carpeta base.
 */
export class LocalDriveClient implements DriveClient {
  readonly browsable = true;
  private base: string;

  constructor(baseDir: string) {
    this.base = path.resolve(baseDir);
  }

  private toId(relPath: string) {
    return `local_${Buffer.from(relPath).toString("base64url")}`;
  }

  private toPath(id: string): string | null {
    if (!id.startsWith("local_")) return null;
    const rel = Buffer.from(id.slice(6), "base64url").toString();
    const abs = path.resolve(this.base, rel);
    // Protección contra "../": la ruta tiene que quedar dentro de la base.
    if (!rel || (abs !== this.base && !abs.startsWith(this.base + path.sep)))
      return null;
    return abs;
  }

  private async describe(abs: string): Promise<DriveItem | null> {
    const info = await stat(abs).catch(() => null);
    if (!info) return null;
    const rel = path.relative(this.base, abs);
    const parentRel = path.dirname(rel);
    const isFolder = info.isDirectory();
    return {
      id: this.toId(rel),
      name: path.basename(abs),
      mimeType: isFolder ? FOLDER_MIME : mimeFromName(abs),
      isFolder,
      size: isFolder ? null : info.size,
      modifiedTime: info.mtime,
      parents: parentRel === "." ? [] : [this.toId(parentRel)],
      trashed: false,
    };
  }

  async rootIds() {
    const entries = await readdir(this.base, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => this.toId(e.name));
  }

  async getItem(id: string) {
    const abs = this.toPath(id);
    return abs ? this.describe(abs) : null;
  }

  async listChildren(folderId: string) {
    const abs = this.toPath(folderId);
    if (!abs) return [];
    const entries = await readdir(abs).catch(() => []);
    const items = (
      await Promise.all(entries.map((e) => this.describe(path.join(abs, e))))
    ).filter((i): i is DriveItem => i !== null);
    return items.sort(
      (a, b) =>
        Number(b.isFolder) - Number(a.isFolder) ||
        a.name.localeCompare(b.name, "es", { numeric: true }),
    );
  }

  async exportText() {
    return null; // en local no hay Google Docs nativos
  }

  async download(
    id: string,
    options: { range?: string | null } = {},
  ): Promise<DriveDownload> {
    const item = await this.getItem(id);
    const abs = this.toPath(id);
    if (!item || !abs || item.isFolder || item.size == null)
      throw new DriveNotFoundError(id);

    const range = parseRange(options.range, item.size);
    if (range === "invalid") throw new DriveRangeError(id);
    const { start, end } = range ?? { start: 0, end: item.size - 1 };
    const stream = createReadStream(abs, { start, end });

    return {
      status: range ? 206 : 200,
      body: Readable.toWeb(stream) as ReadableStream<Uint8Array>,
      contentType: item.mimeType,
      contentLength: end - start + 1,
      contentRange: range ? `bytes ${start}-${end}/${item.size}` : null,
    };
  }
}
