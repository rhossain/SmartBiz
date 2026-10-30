/**
 * tests/realdb/product-photo.realdb.test.ts — product photos on a real Postgres, as the app
 * login (migration 0026; src/catalog/product-photo.ts).
 *
 * Rules restated: setting a photo stores the server-chosen file name, the type and the time,
 * with one `product.photo.set` row naming the types only; removing clears all three; the
 * CHECK refuses a file name the server would never choose, or a half-set row; 0026 applied
 * again changes nothing.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, setDefaultTimeout, test } from "bun:test";
import {
  getProductPhoto,
  memoryPhotoStore,
  setProductPhoto,
} from "../../src/catalog/product-photo.js";
import { MIGRATIONS_DIR } from "../../src/db/migrate.js";
import type { Uuid } from "../../src/data/uuid.js";
import { freshDatabase, realdbEnabled, type FreshDatabase } from "./fresh-database.js";

setDefaultTimeout(30_000);

const BIZ = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" as Uuid;
const OWNER = "11111111-1111-4111-8111-111111111111" as Uuid;
const PRODUCT = "c4000000-0000-4000-8000-0000000000c4";
const AT = "2026-10-30T08:00:00.000Z";
const PNG = "iVBORw0KGgoAAAAA";
const ctx = { businessId: BIZ, actorUserId: OWNER, role: "owner" as const };

const refusal = async (run: () => Promise<unknown>): Promise<string> => {
  try {
    await run();
    return "none";
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
};

describe.skipIf(!realdbEnabled)("product photos on real Postgres", () => {
  let db: FreshDatabase;

  beforeAll(async () => {
    db = await freshDatabase("product_photo", true);
    await db.admin.begin(async (tx) => {
      await tx`INSERT INTO users (id, email, password_hash, role, business_id)
               VALUES (${OWNER}, 'owner@photo.test', 'x', 'owner', ${BIZ})`;
      await tx`INSERT INTO businesses (id, name, owner_user_id) VALUES (${BIZ}, 'A', ${OWNER})`;
    });
    await db.admin`INSERT INTO products (id, business_id, name, sku, selling_price_paise, axes, created_by, created_at, updated_at)
                   VALUES (${PRODUCT}, ${BIZ}, 'কুর্তি', 'KURTI', 1000, '[]'::jsonb, ${OWNER}, ${AT}, ${AT})`;
  });

  afterAll(async () => {
    await db?.drop();
  });

  test("set, read back, then remove; the change log names types only", async () => {
    const store = memoryPhotoStore();
    const set = await setProductPhoto(
      db.app,
      ctx,
      PRODUCT,
      { photo: { contentType: "image/png", data: PNG } },
      store,
    );
    expect(set.ok).toBe(true);
    const [row] = await db.admin<
      { photo_file: string; photo_type: string; photo_updated_at: Date }[]
    >`
      SELECT photo_file, photo_type, photo_updated_at FROM products WHERE id = ${PRODUCT}`;
    expect(row?.photo_file).toMatch(/^[0-9a-f-]{36}\.png$/);
    expect(row?.photo_type).toBe("image/png");
    expect(row?.photo_updated_at).toBeInstanceOf(Date);
    expect((await getProductPhoto(db.app, ctx, PRODUCT, store)).ok).toBe(true);
    const removed = await setProductPhoto(db.app, ctx, PRODUCT, { photo: null }, store);
    expect(removed).toEqual({ ok: true, value: { photoUpdatedAt: null } });
    const logs = await db.admin<{ payload: unknown }[]>`
      SELECT payload FROM audit_log WHERE action = 'product.photo.set' ORDER BY occurred_at, id`;
    expect(logs.map((l) => l.payload)).toEqual([
      { before: null, after: "image/png" },
      { before: "image/png", after: null },
    ]);
  });

  test("the CHECK refuses a path-like name and a half-set row", async () => {
    expect(
      await refusal(
        () =>
          db.admin`UPDATE products SET photo_file = '../etc/passwd', photo_type = 'image/png', photo_updated_at = now() WHERE id = ${PRODUCT}`,
      ),
    ).toContain("products_photo_check");
    expect(
      await refusal(
        () => db.admin`UPDATE products SET photo_type = 'image/png' WHERE id = ${PRODUCT}`,
      ),
    ).toContain("products_photo_check");
  });

  test("migration 0026 applied a second time changes nothing", async () => {
    const body = readFileSync(join(MIGRATIONS_DIR, "0026_product_photos.sql"), "utf8");
    await db.admin.begin((tx) => tx.unsafe(body));
    const [n] = await db.admin<{ n: number }[]>`
      SELECT count(*)::int AS n FROM pg_constraint WHERE conname = 'products_photo_check'`;
    expect(n?.n).toBe(1);
  });
});
