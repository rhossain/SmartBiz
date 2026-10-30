/**
 * src/catalog/product-photo.ts — one photo per product (product photos; migration 0026).
 *
 * Design decisions (chosen on the Owner's "decide for me", 2026-10-30):
 *
 * - Who: setting or removing a photo is Owner and Manager (`canManageCatalog`, as editing a
 *   product); every signed-in role may see it (`canReadCatalog`).
 * - The upload is JSON — `{ photo: { contentType, data } }` with `data` the base64 bytes, or
 *   `{ photo: null }` to remove — so the server's Origin and JSON checks for every write stay
 *   exactly as they are. The browser shrinks the picture first; the decoded image may be at
 *   most 600 KiB (the route's body limit is 1 MiB for the base64 text).
 * - The bytes must BE the declared type: JPEG starts FF D8 FF, PNG 89 50 4E 47 0D 0A 1A 0A,
 *   WebP "RIFF" … "WEBP". Anything else is `invalid_input`, whatever the person named it.
 * - The file name is chosen here, `<uuid>.<jpg|png|webp>`; nothing the person typed reaches a
 *   path. The new file is written first; then, in one transaction, the change-log row
 *   (`product.photo.set`, the type before and after, never the bytes) and the row update. The
 *   old file is removed only after the commit, so a failure at any step leaves the row pointing
 *   at a whole file of the right type.
 * - Bytes live outside the database, in a `PhotoStore` (on disk in production,
 *   src/server/photo-store.ts; in memory in tests).
 */
import { z } from "zod";
import type { Queryable, Sql } from "../db/client.js";
import { now } from "../data/clock.js";
import { notFound, type NotFound } from "../data/not-found.js";
import { err, ok, type Result } from "../data/result.js";
import { isUuid, uuid, type Uuid } from "../data/uuid.js";
import { insertCatalogAudit, productPhotoSet } from "./catalog-audit.js";
import { canManageCatalog, canReadCatalog } from "./catalog-capability.js";
import type { CatalogContext } from "./types.js";

export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type PhotoType = (typeof PHOTO_TYPES)[number];

/** The largest decoded image accepted. */
export const MAX_PHOTO_BYTES = 600 * 1024;

const EXT: Readonly<Record<PhotoType, string>> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Server-chosen photo file names only: a UUID and one of the three extensions. */
export const PHOTO_FILE = /^[0-9a-f-]{36}\.(jpg|png|webp)$/;

export interface PhotoStore {
  readonly write: (name: string, bytes: Uint8Array) => Promise<void>;
  readonly read: (name: string) => Promise<Uint8Array<ArrayBuffer> | null>;
  readonly remove: (name: string) => Promise<void>;
}

/** An in-memory store (tests and the API-only harness). */
export const memoryPhotoStore = (): PhotoStore & { readonly files: Map<string, Uint8Array> } => {
  const files = new Map<string, Uint8Array>();
  return {
    files,
    write: async (name, bytes) => {
      files.set(name, bytes);
    },
    read: async (name) => {
      const b = files.get(name);
      return b === undefined ? null : new Uint8Array(b);
    },
    remove: async (name) => {
      files.delete(name);
    },
  };
};

export const PhotoPatchSchema = z
  .object({
    photo: z
      .object({
        contentType: z.enum(PHOTO_TYPES),
        data: z.string().min(1).max(1_000_000),
      })
      .strict()
      .nullable(),
  })
  .strict();
export type PhotoPatch = z.infer<typeof PhotoPatchSchema>;

export const PhotoQuerySchema = z.object({ v: z.string().max(40).optional() }).strict();

export type PhotoError =
  | NotFound
  | { readonly kind: "forbidden" }
  | {
      readonly kind: "invalid_input";
      readonly fields: ReadonlyArray<{ readonly path: string; readonly message: string }>;
    };

const startsWith = (b: Uint8Array, sig: ReadonlyArray<number>, at = 0): boolean =>
  sig.every((x, i) => b[at + i] === x);

/** True when the bytes are an image of the declared type (by their first bytes). */
export const bytesMatch = (type: PhotoType, b: Uint8Array): boolean => {
  switch (type) {
    case "image/jpeg":
      return startsWith(b, [0xff, 0xd8, 0xff]);
    case "image/png":
      return startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case "image/webp":
      return startsWith(b, [0x52, 0x49, 0x46, 0x46]) && startsWith(b, [0x57, 0x45, 0x42, 0x50], 8);
  }
};

const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

/** The decoded bytes, or null when the text is not base64. */
export const decodeBase64 = (data: string): Uint8Array<ArrayBuffer> | null => {
  if (data.length % 4 !== 0 || !BASE64.test(data)) return null;
  const bin = atob(data);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
};

const invalid = (message: string): PhotoError => ({
  kind: "invalid_input",
  fields: [{ path: "photo", message }],
});

interface PhotoRow {
  readonly photo_file: string | null;
  readonly photo_type: string | null;
}

const isPhotoType = (v: unknown): v is PhotoType =>
  typeof v === "string" && (PHOTO_TYPES as ReadonlyArray<string>).includes(v);

/** Set (`photo` given) or remove (`photo: null`) the product's photo. */
export const setProductPhoto = async (
  sql: Sql,
  ctx: CatalogContext,
  productId: string,
  raw: unknown,
  store: PhotoStore,
): Promise<Result<{ readonly photoUpdatedAt: string | null }, PhotoError>> => {
  if (!canManageCatalog(ctx.role)) return err({ kind: "forbidden" });
  if (!isUuid(productId)) return err(notFound("Product", productId));
  const parsed = PhotoPatchSchema.safeParse(raw);
  if (!parsed.success) return err(invalid("photo must be { contentType, data } or null"));
  const photo = parsed.data.photo;

  let next: { readonly name: string; readonly type: PhotoType } | null = null;
  if (photo !== null) {
    const bytes = decodeBase64(photo.data);
    if (bytes === null) return err(invalid("data is not base64"));
    if (bytes.byteLength > MAX_PHOTO_BYTES) return err(invalid("the photo is larger than 600 KiB"));
    if (!bytesMatch(photo.contentType, bytes))
      return err(invalid("the bytes are not that image type"));
    next = { name: `${uuid()}.${EXT[photo.contentType]}`, type: photo.contentType };
    await store.write(next.name, bytes);
  }

  const at = now().toISOString();
  const r = await sql.begin(
    async (tx): Promise<Result<{ before: string | null; at: string | null }, PhotoError>> => {
      const rows = await tx<PhotoRow[]>`
        SELECT photo_file, photo_type FROM products
        WHERE id = ${productId} AND business_id = ${ctx.businessId} FOR UPDATE
      `;
      const row = rows[0];
      if (!row) return err(notFound("Product", productId));
      await insertCatalogAudit(
        tx,
        ctx,
        productPhotoSet(productId as Uuid, { before: row.photo_type, after: next?.type ?? null }),
      );
      await tx`
        UPDATE products SET photo_file = ${next?.name ?? null}, photo_type = ${next?.type ?? null},
          photo_updated_at = ${next === null ? null : at}
        WHERE id = ${productId} AND business_id = ${ctx.businessId}
      `;
      return ok({ before: row.photo_file, at: next === null ? null : at });
    },
  );
  if (!r.ok) {
    if (next !== null) await store.remove(next.name);
    return r;
  }
  // The old file goes only after the commit; a missing one is no harm.
  if (r.value.before !== null && PHOTO_FILE.test(r.value.before)) {
    await store.remove(r.value.before);
  }
  return ok({ photoUpdatedAt: r.value.at });
};

/** The product's photo bytes and type, or not_found when it has none. */
export const getProductPhoto = async (
  sql: Queryable,
  ctx: CatalogContext,
  productId: string,
  store: PhotoStore,
): Promise<
  Result<{ readonly bytes: Uint8Array<ArrayBuffer>; readonly type: PhotoType }, PhotoError>
> => {
  if (!canReadCatalog(ctx.role)) return err({ kind: "forbidden" });
  if (!isUuid(productId)) return err(notFound("Product", productId));
  const rows = await sql<PhotoRow[]>`
    SELECT photo_file, photo_type FROM products WHERE id = ${productId} AND business_id = ${ctx.businessId}
  `;
  const row = rows[0];
  if (
    !row ||
    row.photo_file === null ||
    !PHOTO_FILE.test(row.photo_file) ||
    !isPhotoType(row.photo_type)
  ) {
    return err(notFound("Photo", productId));
  }
  const bytes = await store.read(row.photo_file);
  return bytes === null ? err(notFound("Photo", productId)) : ok({ bytes, type: row.photo_type });
};
