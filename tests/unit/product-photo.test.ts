/**
 * tests/unit/product-photo.test.ts — product photos (src/catalog/product-photo.ts,
 * src/server/photo-store.ts, the photo routes through the real pipeline).
 *
 * Rules restated:
 *   - Owner and Manager set or remove a product's one photo; Sales Staff and the Accountant are
 *     refused; every role may see it;
 *   - the bytes must BE the declared type (JPEG FF D8 FF, PNG's 8-byte signature, WebP
 *     RIFF…WEBP), be base64 and decode to at most 600 KiB — otherwise invalid_input and nothing
 *     is stored;
 *   - the server names the file `<uuid>.<ext>`; a replaced or removed photo's old file is
 *     deleted after the commit; the change-log row holds the types before and after, never
 *     the bytes;
 *   - the disk store refuses any name it did not choose (no path from a request);
 *   - only the photo route takes a body over 64 KiB (up to 1 MiB); the image answer carries
 *     its type, `nosniff` and `no-store`.
 */
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import {
  bytesMatch,
  decodeBase64,
  getProductPhoto,
  memoryPhotoStore,
  MAX_PHOTO_BYTES,
  setProductPhoto,
} from "../../src/catalog/product-photo.js";
import { diskPhotoStore } from "../../src/server/photo-store.js";
import {
  CATALOG_IDS,
  auditRows,
  catalogWorld,
  ctxFor,
  seedCatalog,
} from "../helpers/catalog-fixtures.js";
import { harness, request, seedBusiness } from "../helpers/server-harness.js";
import { makeSqlStub } from "../helpers/sql-stub.js";

const PNG = "iVBORw0KGgoAAAAA"; // 89 50 4E 47 0D 0A 1A 0A 00 00 00 00
const JPEG = "/9j/4AAQSkZJRg=="; // FF D8 FF E0 00 10 4A 46 49 46
const WEBP = btoa("RIFF\u0000\u0000\u0000\u0000WEBPVP8 ");
const P = CATALOG_IDS.product;

const world = async () => {
  const stub = await catalogWorld();
  seedCatalog(stub);
  return stub;
};

const row = (stub: Awaited<ReturnType<typeof world>>) =>
  stub.state.products.find((p) => p["id"] === P)!;

describe("photo checks (pure)", () => {
  test("each type's first bytes are required", () => {
    const png = decodeBase64(PNG)!;
    const jpeg = decodeBase64(JPEG)!;
    const webp = decodeBase64(WEBP)!;
    expect([
      bytesMatch("image/png", png),
      bytesMatch("image/jpeg", jpeg),
      bytesMatch("image/webp", webp),
    ]).toEqual([true, true, true]);
    expect([
      bytesMatch("image/jpeg", png),
      bytesMatch("image/png", jpeg),
      bytesMatch("image/webp", png),
    ]).toEqual([false, false, false]);
  });

  test("base64 only", () => {
    expect(decodeBase64("not base64!")).toBeNull();
    expect(decodeBase64("abc")).toBeNull();
    expect(decodeBase64("QQ==")).toEqual(new Uint8Array([65]));
  });
});

describe("setProductPhoto / getProductPhoto (stub)", () => {
  test("the Owner sets a PNG: file stored under a server name, row updated, type logged", async () => {
    const stub = await world();
    const store = memoryPhotoStore();
    const r = await setProductPhoto(
      stub.sql,
      ctxFor("owner"),
      P,
      { photo: { contentType: "image/png", data: PNG } },
      store,
    );
    expect(r.ok).toBe(true);
    const name = String(row(stub)["photo_file"]);
    expect(name).toMatch(/^[0-9a-f-]{36}\.png$/);
    expect([...store.files.keys()]).toEqual([name]);
    expect(row(stub)["photo_type"]).toBe("image/png");
    const logged = auditRows(stub).filter((a) => a.action === "product.photo.set");
    expect(logged.map((a) => a.payload)).toEqual([{ before: null, after: "image/png" }]);
    const got = await getProductPhoto(stub.sql, ctxFor("sales_staff"), P, store);
    expect(got).toEqual({ ok: true, value: { bytes: decodeBase64(PNG)!, type: "image/png" } });
  });

  test("replacing removes the old file; removing clears the row and the file", async () => {
    const stub = await world();
    const store = memoryPhotoStore();
    await setProductPhoto(
      stub.sql,
      ctxFor("manager"),
      P,
      { photo: { contentType: "image/png", data: PNG } },
      store,
    );
    const first = String(row(stub)["photo_file"]);
    await setProductPhoto(
      stub.sql,
      ctxFor("manager"),
      P,
      { photo: { contentType: "image/jpeg", data: JPEG } },
      store,
    );
    const second = String(row(stub)["photo_file"]);
    expect(second).toMatch(/\.jpg$/);
    expect([...store.files.keys()]).toEqual([second]);
    expect(first).not.toBe(second);
    const r = await setProductPhoto(stub.sql, ctxFor("owner"), P, { photo: null }, store);
    expect(r).toEqual({ ok: true, value: { photoUpdatedAt: null } });
    expect([row(stub)["photo_file"], row(stub)["photo_type"], store.files.size]).toEqual([
      null,
      null,
      0,
    ]);
    expect((await getProductPhoto(stub.sql, ctxFor("owner"), P, store)).ok).toBe(false);
  });

  test("wrong bytes, bad base64, too large or a GIF are invalid_input; nothing is stored", async () => {
    const stub = await world();
    const store = memoryPhotoStore();
    const big = btoa(
      String.fromCharCode(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a) +
        "\u0000".repeat(MAX_PHOTO_BYTES),
    );
    for (const photo of [
      { contentType: "image/jpeg", data: PNG },
      { contentType: "image/png", data: "%%%%" },
      { contentType: "image/png", data: big.slice(0, 900_000) },
      { contentType: "image/gif", data: "R0lGODlh" },
    ]) {
      const r = await setProductPhoto(stub.sql, ctxFor("owner"), P, { photo }, store);
      expect({ type: photo.contentType, kind: r.ok ? "ok" : r.error.kind }).toEqual({
        type: photo.contentType,
        kind: "invalid_input",
      });
    }
    expect([store.files.size, row(stub)["photo_file"] ?? null]).toEqual([0, null]);
    expect(auditRows(stub).some((a) => a.action === "product.photo.set")).toBe(false);
  });

  test("Sales Staff and the Accountant may not set a photo; a missing product is not_found", async () => {
    const stub = await world();
    const store = memoryPhotoStore();
    for (const role of ["sales_staff", "accountant"] as const) {
      const r = await setProductPhoto(stub.sql, ctxFor(role), P, { photo: null }, store);
      expect({ role, r }).toEqual({ role, r: { ok: false, error: { kind: "forbidden" } } });
    }
    const missing = await setProductPhoto(
      stub.sql,
      ctxFor("owner"),
      "d0000000-0000-4000-8000-0000000000d0",
      { photo: { contentType: "image/png", data: PNG } },
      store,
    );
    expect(missing.ok ? "ok" : missing.error.kind).toBe("not_found");
    // The file written before the row lookup was taken back.
    expect(store.files.size).toBe(0);
  });
});

describe("disk photo store", () => {
  test("writes, reads and removes; refuses a name it did not choose", async () => {
    const dir = await mkdtemp(join(tmpdir(), "photos-"));
    try {
      const store = diskPhotoStore(dir);
      const name = "0a000000-0000-4000-8000-000000000001.png";
      await store.write(name, new Uint8Array([1, 2, 3]));
      expect(await readdir(dir)).toEqual([name]);
      expect(await store.read(name)).toEqual(new Uint8Array([1, 2, 3]));
      await store.remove(name);
      expect(await store.read(name)).toBeNull();
      await expect(store.write("../escape.png", new Uint8Array([1]))).rejects.toThrow();
      await expect(store.read("x.png")).rejects.toThrow();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe("photo routes through the pipeline", () => {
  test("the upload route takes a large body; every other route still stops at 64 KiB", async () => {
    const stub = makeSqlStub();
    const tokens = await seedBusiness(stub);
    seedCatalog(stub);
    const h = harness(stub);
    const padded = PNG + "A".repeat(700_000); // 700 KB of base64, decodes to ~525 KB
    const big = await h.send(
      request("PATCH", `/api/products/${P}/photo`, {
        token: tokens.owner,
        body: { photo: { contentType: "image/png", data: padded } },
      }),
    );
    expect(big.status).toBe(200);
    const other = await h.send(
      request("PATCH", `/api/products/${P}`, {
        token: tokens.owner,
        body: { name: "x".repeat(70_000) },
      }),
    );
    expect(other.status).toBe(413);
    const tooBig = await h.send(
      request("PATCH", `/api/products/${P}/photo`, {
        token: tokens.owner,
        headers: { "Content-Length": "2000000" },
      }),
    );
    expect(tooBig.status).toBe(413);
  });

  test("the image answer carries its type, nosniff and no-store", async () => {
    const stub = makeSqlStub();
    const tokens = await seedBusiness(stub);
    seedCatalog(stub);
    const h = harness(stub);
    await h.send(
      request("PATCH", `/api/products/${P}/photo`, {
        token: tokens.manager,
        body: { photo: { contentType: "image/png", data: PNG } },
      }),
    );
    const r = await h.send(
      request("GET", `/api/products/${P}/photo?v=1`, { token: tokens.accountant }),
    );
    expect(r.status).toBe(200);
    expect([
      r.headers.get("content-type"),
      r.headers.get("x-content-type-options"),
      r.headers.get("cache-control"),
    ]).toEqual(["image/png", "nosniff", "no-store"]);
    expect(new Uint8Array(await r.arrayBuffer())).toEqual(decodeBase64(PNG)!);
  });
});
