/**
 * src/server/photo-store.ts — product photos on disk (zero spend: this machine, no hosted
 * storage).
 *
 * The directory is `SMARTBIZ_PHOTO_DIR`, or `data/photos` under the working directory; it is
 * gitignored and created on first write. Only server-chosen names (`PHOTO_FILE`) are read or
 * written, so no request can name a path. A write goes to a temporary file in the same
 * directory and is renamed into place, so a reader never sees half a photo. Back the directory
 * up with the database dump (README "Backup and restore").
 */
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { PHOTO_FILE, type PhotoStore } from "../catalog/product-photo.js";

export const photoDir = (env: Readonly<Record<string, string | undefined>> = process.env): string =>
  resolve(env["SMARTBIZ_PHOTO_DIR"] ?? "data/photos");

const checked = (name: string): string => {
  if (!PHOTO_FILE.test(name)) throw new Error("refusing a photo name the server did not choose");
  return name;
};

export const diskPhotoStore = (dir: string): PhotoStore => ({
  write: async (name, bytes) => {
    await mkdir(dir, { recursive: true });
    const target = join(dir, checked(name));
    const temp = `${target}.tmp`;
    await writeFile(temp, bytes);
    await rename(temp, target);
  },
  read: async (name) => {
    try {
      const b = await readFile(join(dir, checked(name)));
      return new Uint8Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
    } catch (e) {
      if ((e as { code?: string }).code === "ENOENT") return null;
      throw e;
    }
  },
  remove: async (name) => {
    await rm(join(dir, checked(name)), { force: true });
  },
});
