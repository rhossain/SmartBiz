/**
 * tests/realdb/catalog-paths.realdb.test.ts — the catalog's data paths on a real Postgres, as
 * the app login (U4 BR4.3, BR6.2, BR6.6, BR10.1, BR11.1, BR11.2, BR14.1, BR14.2; R15–R18;
 * S28, S32; NFR1.15, NFR3.27, NFR7.22–NFR7.25; NFR-design review R-02, R-04; project.md "run
 * the data paths against a throwaway real Postgres").
 *
 * The stub cannot see row locks, unique-index races, `unnest` parameter typing, `ANY(uuid[])`,
 * `ILIKE … ESCAPE` or real rollback, so this file shows them:
 *   - atomicity (R15, NFR3.27): a failure injected after the product insert
 *     (`hooks.afterProductInsert`) leaves no product, variant or change-log row; a failure
 *     injected after the lock of every edit leaves neither the change-log row nor the change;
 *   - races (R16, R17): two creates with the same SKU in different case, and two revisions of
 *     one note made to pass their checks together, end with exactly one success and one
 *     `conflict` — never a thrown error;
 *   - concurrent edits of one variant and of one customer both succeed in order, and their
 *     change-log rows chain: the second's before is the first's after (R18, NFR7.25);
 *   - the multi-row variant insert over typed parallel arrays stores Bangla values, suffixes
 *     and 144 variants correctly (R-04, P21);
 *   - tenancy (S28, NFR1.15): every read and write with another business's context finds
 *     nothing — the named mutant "business filter dropped from the product read" fails here;
 *   - search escaping (S32) and the C8 functions (BR14) on real SQL.
 * A deployment holds one business (businesses_singleton_idx), so "another business" is a
 * business id with no rows (as tests/realdb/order-paths.realdb.test.ts does).
 * The HTTP 404 bodies for foreign and non-UUID ids are compared byte for byte in the last
 * describe block.
 */
import { afterAll, beforeAll, describe, expect, setDefaultTimeout, test } from "bun:test";
import {
  createCustomer,
  getCustomerDetail,
  listCustomers,
  updateCustomer,
} from "../../src/catalog/customers.js";
import { customerNames, getCustomer, getVariant, variantLabels } from "../../src/catalog/index.js";
import { listLowStock } from "../../src/catalog/low-stock.js";
import { addNote } from "../../src/catalog/notes.js";
import {
  createProduct,
  getProduct,
  listProducts,
  updateProduct,
} from "../../src/catalog/products.js";
import { setCost, setStock } from "../../src/catalog/stock.js";
import { createSupplier, listSuppliers, updateSupplier } from "../../src/catalog/suppliers.js";
import type { CatalogContext } from "../../src/catalog/types.js";
import type { TxHooks } from "../../src/auth/types.js";
import type { Uuid } from "../../src/data/uuid.js";
import { insertSession } from "../../src/auth/session.js";
import { largestProductRequest, productRequest } from "../helpers/catalog-fixtures.js";
import { harness, NOW, request } from "../helpers/server-harness.js";
import { makeSqlStub } from "../helpers/sql-stub.js";
import { deferred } from "../helpers/staff-fixtures.js";
import { freshDatabase, realdbEnabled, type FreshDatabase } from "./fresh-database.js";

const BIZ = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" as Uuid;
const FOREIGN = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" as Uuid;
const OWNER = "11111111-1111-4111-8111-111111111111" as Uuid;

const ctx: CatalogContext = { businessId: BIZ, actorUserId: OWNER, role: "owner" };
const foreignCtx: CatalogContext = { businessId: FOREIGN, actorUserId: OWNER, role: "owner" };

// Fresh databases and concurrent transactions on a loaded machine; a test time-out only.
setDefaultTimeout(30_000);

const must = <T>(r: { ok: true; value: T } | { ok: false; error: unknown }): T => {
  if (!r.ok) throw new Error(`expected ok, got ${JSON.stringify(r.error)}`);
  return r.value;
};

const failing: TxHooks = {
  afterLock: async () => {
    throw new Error("injected failure after the lock");
  },
};

/** A barrier: each caller waits until `n` callers have arrived. */
const barrier = (n: number) => {
  const gate = deferred();
  let arrived = 0;
  return async (): Promise<void> => {
    arrived += 1;
    if (arrived >= n) gate.resolve();
    await gate.promise;
  };
};

describe.skipIf(!realdbEnabled)("catalog data paths on real Postgres", () => {
  let db: FreshDatabase;

  const auditCount = async (): Promise<number> => {
    const [row] = await db.admin<{ n: number }[]>`SELECT count(*)::int AS n FROM audit_log`;
    return row?.n ?? -1;
  };
  const payloads = async (action: string, subject: string) =>
    (
      await db.admin<{ payload: Record<string, unknown> }[]>`
        SELECT payload FROM audit_log WHERE action = ${action} AND subject_id = ${subject}
        ORDER BY occurred_at, id
      `
    ).map((r) => r.payload);

  beforeAll(async () => {
    db = await freshDatabase("catpaths");
    await db.admin.begin(async (tx) => {
      await tx`INSERT INTO users (id, email, password_hash, role, business_id)
               VALUES (${OWNER}, 'owner@realdb.test', 'x', 'owner', ${BIZ})`;
      await tx`INSERT INTO businesses (id, name, owner_user_id) VALUES (${BIZ}, 'A', ${OWNER})`;
    });
  });

  afterAll(async () => {
    await db.drop();
  });

  test("a failure after the product insert leaves no product, variant or change-log row (R15)", async () => {
    const before = await auditCount();
    const hooks: TxHooks = {
      afterProductInsert: async () => {
        throw new Error("injected failure after the product insert");
      },
    };
    await expect(
      createProduct(db.app, ctx, productRequest("ATOMIC-1") as never, { hooks }),
    ).rejects.toThrow(/injected/);
    const [rows] = await db.admin<{ p: number; v: number }[]>`
      SELECT (SELECT count(*)::int FROM products WHERE sku = 'ATOMIC-1') AS p,
             (SELECT count(*)::int FROM variants) AS v
    `;
    expect(rows).toEqual({ p: 0, v: 0 });
    expect(await auditCount()).toBe(before);
  });

  test("a failure after the lock of every edit leaves neither the change-log row nor the change", async () => {
    const c = must(
      await createCustomer(db.app, ctx, { name: "Atomic", phone: "01712345678" }),
    ).customer;
    const s = must(await createSupplier(db.app, ctx, { name: "S", phone: "01711111111" }));
    const p = must(await createProduct(db.app, ctx, productRequest("ATOMIC-2") as never));
    const v = p.variants[0]!;
    const before = await auditCount();
    const attempts: Array<[string, () => Promise<unknown>]> = [
      [
        "customer",
        () => updateCustomer(db.app, ctx, c.id, { name: "Changed" }, { hooks: failing }),
      ],
      [
        "supplier",
        () => updateSupplier(db.app, ctx, s.id, { name: "Changed" }, { hooks: failing }),
      ],
      ["product", () => updateProduct(db.app, ctx, p.id, { name: "Changed" }, { hooks: failing })],
      ["stock", () => setStock(db.app, ctx, v.id, { stock: 99 }, { hooks: failing })],
      ["cost", () => setCost(db.app, ctx, p.id, { purchaseCostPaise: 1 }, { hooks: failing })],
      ["note", () => addNote(db.app, ctx, c.id, { text: "x" }, { hooks: failing })],
    ];
    for (const [what, run] of attempts) {
      const outcome = await run().then(
        () => "written",
        (e: unknown) => (e instanceof Error ? e.message : String(e)),
      );
      expect({ what, outcome }).toEqual({ what, outcome: "injected failure after the lock" });
    }
    expect(await auditCount()).toBe(before);
    const [state] = await db.admin<
      { c: string; s: string; p: string; stock: number; cost: string; n: number }[]
    >`
      SELECT (SELECT name FROM customers WHERE id = ${c.id}) AS c,
             (SELECT name FROM suppliers WHERE id = ${s.id}) AS s,
             (SELECT name FROM products WHERE id = ${p.id}) AS p,
             (SELECT stock FROM variants WHERE id = ${v.id}) AS stock,
             (SELECT purchase_cost_paise::text FROM products WHERE id = ${p.id}) AS cost,
             (SELECT count(*)::int FROM customer_notes WHERE customer_id = ${c.id}) AS n
    `;
    expect(state).toEqual({
      c: "Atomic",
      s: "S",
      p: "কুর্তি",
      stock: v.stock,
      cost: "80000",
      n: 0,
    });
  });

  test("two creates with the same SKU in different case: one 201, one conflict (R16)", async () => {
    const results = await Promise.all([
      createProduct(db.app, ctx, productRequest("RACE-SKU") as never),
      createProduct(db.app, ctx, productRequest("race-sku") as never),
    ]);
    const kinds = results.map((r) => (r.ok ? "created" : r.error.kind)).sort();
    expect(kinds).toEqual(["conflict", "created"]);
    const [n] = await db.admin<{ n: number }[]>`
      SELECT count(*)::int AS n FROM products WHERE lower(sku) = 'race-sku'
    `;
    expect(n?.n).toBe(1);
  });

  test("two revisions of one note past their checks together: one 201, one conflict (R17)", async () => {
    const c = must(
      await createCustomer(db.app, ctx, { name: "Race", phone: "01712345670" }),
    ).customer;
    const first = must(await addNote(db.app, ctx, c.id, { text: "first" }));
    const together = barrier(2);
    const hooks: TxHooks = { afterLock: together };
    const results = await Promise.all([
      addNote(db.app, ctx, c.id, { text: "A", revisesNoteId: first.id }, { hooks }),
      addNote(db.app, ctx, c.id, { text: "B", revisesNoteId: first.id }, { hooks }),
    ]);
    expect(results.map((r) => (r.ok ? "created" : r.error.kind)).sort()).toEqual([
      "conflict",
      "created",
    ]);
    const [n] = await db.admin<{ n: number }[]>`
      SELECT count(*)::int AS n FROM customer_notes WHERE revises_note_id = ${first.id}
    `;
    expect(n?.n).toBe(1);
    expect((await payloads("customer.note.add", c.id)).length).toBe(2);
  });

  test("concurrent stock sets and customer edits both succeed and chain their change log (R18)", async () => {
    const p = must(await createProduct(db.app, ctx, productRequest("CHAIN-1") as never));
    const v = p.variants[0]!; // stock 5
    const [a, b] = await Promise.all([
      setStock(db.app, ctx, v.id, { stock: 10 }),
      setStock(db.app, ctx, v.id, { stock: 20 }),
    ]);
    expect([a.ok, b.ok]).toEqual([true, true]);
    const stockRows = (await payloads("variant.stock.set", v.id)).map(
      (pl) => pl["stock"] as { before: number; after: number },
    );
    expect(stockRows).toHaveLength(2);
    const firstRow = stockRows.find((r) => r.before === 5)!;
    const secondRow = stockRows.find((r) => r !== firstRow)!;
    expect(secondRow.before).toBe(firstRow.after);
    const [stored] = await db.admin<
      { stock: number }[]
    >`SELECT stock FROM variants WHERE id = ${v.id}`;
    expect(stored?.stock).toBe(secondRow.after);

    const c = must(
      await createCustomer(db.app, ctx, { name: "Chain", phone: "01712345671" }),
    ).customer;
    await Promise.all([
      updateCustomer(db.app, ctx, c.id, { riskLevel: 1 }),
      updateCustomer(db.app, ctx, c.id, { riskLevel: 2 }),
    ]);
    const risk = (await payloads("customer.update", c.id)).map(
      (pl) => pl["riskLevel"] as { before: number; after: number },
    );
    expect(risk).toHaveLength(2);
    const r1 = risk.find((r) => r.before === 0)!;
    const r2 = risk.find((r) => r !== r1)!;
    expect(r2.before).toBe(r1.after);
  });

  test("the multi-row variant insert stores Bangla values and 144 variants (R-04, P21)", async () => {
    const p = must(await createProduct(db.app, ctx, productRequest("BANGLA-1") as never));
    const rows = await db.admin<{ axis_values: string[]; sku_suffix: string; stock: number }[]>`
      SELECT axis_values, sku_suffix, stock FROM variants WHERE product_id = ${p.id}
      ORDER BY sku_suffix
    `;
    expect(rows.map((r) => [r.axis_values, r.sku_suffix])).toEqual([
      [["L", "নীল"], "L-নীল"],
      [["L", "লাল"], "L-লাল"],
      [["M", "নীল"], "M-নীল"],
      [["M", "লাল"], "M-লাল"],
    ]);
    const read = must(await getProduct(db.app, ctx, p.id));
    expect(read.variants.map((v) => v.fullSku)).toEqual(p.variants.map((v) => v.fullSku));
    const big = must(await createProduct(db.app, ctx, largestProductRequest("BIG-144") as never));
    const [n] = await db.admin<{ n: number }[]>`
      SELECT count(*)::int AS n FROM variants WHERE product_id = ${big.id}
    `;
    expect(n?.n).toBe(144);
    const none = must(
      await createProduct(
        db.app,
        ctx,
        productRequest("SINGLE-1", {
          axes: [],
          variants: [{ axisValues: [], stock: 1, minimumStock: 0 }],
        }) as never,
      ),
    );
    const [single] = await db.admin<{ axis_values: string[]; sku_suffix: string }[]>`
      SELECT axis_values, sku_suffix FROM variants WHERE product_id = ${none.id}
    `;
    expect(single).toEqual({ axis_values: [], sku_suffix: "" });
  });

  test("another business's context finds nothing on any read or write (S28, NFR1.15)", async () => {
    const c = must(
      await createCustomer(db.app, ctx, { name: "Mine", phone: "01712345672" }),
    ).customer;
    const s = must(await createSupplier(db.app, ctx, { name: "Mine", phone: "01711111112" }));
    const p = must(
      await createProduct(
        db.app,
        ctx,
        productRequest("MINE-1", { defaultSupplierId: s.id }) as never,
      ),
    );
    const v = p.variants[0]!;
    // The product read: the named mutant drops its business filter, and this then fails.
    const read = await getProduct(db.app, foreignCtx, p.id);
    expect(read.ok ? "found" : read.error.kind).toBe("not_found");
    const outcomes = {
      customer: await getCustomerDetail(db.app, foreignCtx, c.id),
      editCustomer: await updateCustomer(db.app, foreignCtx, c.id, { name: "x" }),
      note: await addNote(db.app, foreignCtx, c.id, { text: "x" }),
      editSupplier: await updateSupplier(db.app, foreignCtx, s.id, { name: "x" }),
      editProduct: await updateProduct(db.app, foreignCtx, p.id, { name: "x" }),
      stock: await setStock(db.app, foreignCtx, v.id, { stock: 1 }),
      cost: await setCost(db.app, foreignCtx, p.id, { purchaseCostPaise: 1 }),
      c8Customer: await getCustomer(db.app, foreignCtx, c.id),
      c8Variant: await getVariant(db.app, foreignCtx, v.id),
      linkSupplier: await createProduct(
        db.app,
        ctx,
        productRequest("MINE-2", {
          defaultSupplierId: "0f0f0f0f-0f0f-4f0f-8f0f-0f0f0f0f0f0f",
        }) as never,
      ),
    };
    for (const [what, r] of Object.entries(outcomes)) {
      expect({ what, kind: r.ok ? "ok" : r.error.kind }).toEqual({ what, kind: "not_found" });
    }
    expect(must(await listCustomers(db.app, foreignCtx, {})).total).toBe(0);
    expect(must(await listProducts(db.app, foreignCtx, {})).total).toBe(0);
    expect(must(await listSuppliers(db.app, foreignCtx)).suppliers).toEqual([]);
    expect(must(await listLowStock(db.app, foreignCtx)).variants).toEqual([]);
    expect((await customerNames(db.app, foreignCtx, [c.id])).size).toBe(0);
    expect((await variantLabels(db.app, foreignCtx, [v.id])).size).toBe(0);
  });

  test("search on real SQL: names ignoring case, 4+ phone digits, % and _ literal (BR5.1, S32)", async () => {
    for (const [name, phone] of [
      ["Search 50%", "01790000001"],
      ["Search 500", "01790000002"],
      ["x_y Search", "01790000003"],
      ["xzy Search", "01790000004"],
    ] as const) {
      must(await createCustomer(db.app, ctx, { name, phone }));
    }
    const names = async (q: string) =>
      must(await listCustomers(db.app, ctx, { q }))
        .customers.map((c) => c.name)
        .sort();
    expect(await names("50%")).toEqual(["Search 50%"]);
    expect(await names("x_y")).toEqual(["x_y Search"]);
    expect(await names("SEARCH")).toHaveLength(4);
    expect(await names("০০০৩")).toEqual(["x_y Search"]);
    const page = must(await listCustomers(db.app, ctx, { q: "search", limit: 3 }));
    expect([page.customers.length, page.total, page.nextCursor !== null]).toEqual([3, 4, true]);
    const next = must(
      await listCustomers(db.app, ctx, { q: "search", limit: 3, cursor: page.nextCursor ?? "" }),
    );
    expect(next.customers).toHaveLength(1);
    expect(
      must(await listProducts(db.app, ctx, { q: "bangla" })).products.map((p) => p.sku),
    ).toEqual(["BANGLA-1"]);
  });

  test("over HTTP: another business's ids, unknown and non-UUID ids answer byte-equal 404s (S28)", async () => {
    // Rows of another business, seeded with foreign-key triggers off for one transaction.
    const ids = {
      customer: "c0000000-0000-4000-8000-0000000000f1",
      product: "c0000000-0000-4000-8000-0000000000f2",
      variant: "c0000000-0000-4000-8000-0000000000f3",
      supplier: "c0000000-0000-4000-8000-0000000000f4",
    };
    const at = "2026-10-27T08:00:00.000Z";
    await db.admin.begin(async (tx) => {
      await tx`SET LOCAL session_replication_role = replica`;
      await tx`INSERT INTO customers (id, business_id, name, phone, created_by, created_at, updated_at)
               VALUES (${ids.customer}, ${FOREIGN}, 'F', '01712345699', ${OWNER}, ${at}, ${at})`;
      await tx`INSERT INTO suppliers (id, business_id, name, phone, created_by, created_at, updated_at)
               VALUES (${ids.supplier}, ${FOREIGN}, 'F', '01712345699', ${OWNER}, ${at}, ${at})`;
      await tx`INSERT INTO products (id, business_id, name, sku, selling_price_paise, created_by, created_at, updated_at)
               VALUES (${ids.product}, ${FOREIGN}, 'F', 'FOREIGN-HTTP', 1, ${OWNER}, ${at}, ${at})`;
      await tx`INSERT INTO variants (id, business_id, product_id, stock, minimum_stock, created_at, updated_at)
               VALUES (${ids.variant}, ${FOREIGN}, ${ids.product}, 1, 0, ${at}, ${at})`;
    });
    const h = harness(makeSqlStub(), { sql: db.app });
    const session = await insertSession(db.app, { userId: OWNER, businessId: BIZ, at: NOW });
    const routes: ReadonlyArray<readonly [string, string, keyof typeof ids, unknown]> = [
      ["GET", "/api/customers/:id", "customer", undefined],
      ["PATCH", "/api/customers/:id", "customer", { name: "x" }],
      ["POST", "/api/customers/:id/notes", "customer", { text: "x" }],
      ["GET", "/api/products/:id", "product", undefined],
      ["PATCH", "/api/products/:id", "product", { name: "x" }],
      ["PATCH", "/api/products/:id/cost", "product", { purchaseCostPaise: 1 }],
      ["PATCH", "/api/variants/:id/stock", "variant", { stock: 2 }],
      ["PATCH", "/api/suppliers/:id", "supplier", { name: "x" }],
    ];
    const bodies = new Set<string>();
    for (const [method, path, kind, body] of routes) {
      for (const id of [ids[kind], "0f0f0f0f-0f0f-4f0f-8f0f-0f0f0f0f0f0f", "not-a-uuid"]) {
        const r = await h.send(
          request(method, path.replace(":id", id), { token: session.token, body }),
        );
        expect({ method, path, id, status: r.status }).toEqual({ method, path, id, status: 404 });
        bodies.add(await r.text());
      }
    }
    expect([...bodies]).toEqual(['{"error":"not_found"}']);
    // The foreign rows are untouched.
    const [v] = await db.admin<
      { stock: number }[]
    >`SELECT stock FROM variants WHERE id = ${ids.variant}`;
    expect(v?.stock).toBe(1);
  });

  test("the C8 functions and the low-stock list on real SQL (BR14, BR7.3)", async () => {
    const s = must(
      await createSupplier(db.app, ctx, { name: "Low Supplier", phone: "01711111113" }),
    );
    const p = must(
      await createProduct(
        db.app,
        ctx,
        productRequest("LOW-1", { name: "Low", defaultSupplierId: s.id }) as never,
      ),
    );
    const lowVariant = p.variants.find((v) => v.low)!;
    expect(must(await getVariant(db.app, ctx, lowVariant.id))).toEqual({
      id: lowVariant.id,
      productId: p.id,
      label: `Low · ${lowVariant.axisValues.join(" · ")}`,
      sellingPricePaise: 120_000,
    });
    const labels = await variantLabels(
      db.app,
      ctx,
      p.variants.map((v) => v.id),
    );
    expect(labels.size).toBe(4);
    const low = must(await listLowStock(db.app, ctx));
    const row = low.variants.find((r) => r.variantId === lowVariant.id);
    expect(row?.supplier).toEqual({ id: s.id, name: "Low Supplier", phone: "01711111113" });
    const c = must(
      await createCustomer(db.app, ctx, { name: "C8", phone: "01712345673" }),
    ).customer;
    expect((await customerNames(db.app, ctx, [c.id])).get(c.id)).toBe("C8");
  });
});
