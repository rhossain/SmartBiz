/**
 * tests/unit/check-links.test.ts — orders link only to the session's business's catalog
 * (U5 BR1.1, BR1.2, BR4.3; S34; NFR1.16, NFR7.29; AC4.1.2, AC4.1.3) on the fail-closed stub.
 *
 * Restated rules:
 *   - a customer id is checked with one query; a non-UUID customer or variant id is
 *     `not_found` before any SQL;
 *   - variant ids are de-duplicated and checked in chunks of at most 50 (50 ids → 1 query,
 *     51 → 2, 200 → 4); an id missing from the answer is `not_found` naming that id;
 *   - createOrder checks before drawing the order number: a refused order writes no order,
 *     no line, no change-log row and burns no ORD-####;
 *   - updateOrder: order not found, then not editable, then link not found; an edit that
 *     changes neither the customer nor the lines runs no catalog query;
 *   - no file in src/orders names a catalog table in SQL (C8 rule 5).
 * The real-SQL twins of these paths are in tests/realdb/orders-catalog.realdb.test.ts.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { FROZEN_TEST_NOW, resetTestClock, setTestClock } from "../../src/data/clock.js";
import type { Uuid } from "../../src/data/uuid.js";
import { checkLinks, linksToCheck, nothingToCheck } from "../../src/orders/check-links.js";
import { createOrder } from "../../src/orders/create-order.js";
import { updateOrder } from "../../src/orders/update-order.js";
import { CATALOG_IDS, catalogWorld, seedCatalog } from "../helpers/catalog-fixtures.js";
import {
  BUSINESS_A,
  BUSINESS_B,
  OWNER_A,
  createInput,
  ctxFor,
  itemInput,
} from "../helpers/order-fixtures.js";

const ctx = ctxFor(BUSINESS_A, OWNER_A);
const MISSING = "d0000000-0000-4000-8000-0000000000d0";

const VARIANT_QUERY = /FROM variants v\s+JOIN products p[\s\S]*ANY\(\?::uuid\[\]\)/;
const CUSTOMER_QUERY = /FROM customers WHERE id = \? AND business_id = \?/;
const CATALOG_QUERY = /\b(customers|variants|products)\b/;

/** The harness business with its seeded customer, product and two variants. */
const world = async () => {
  const stub = await catalogWorld();
  seedCatalog(stub);
  stub.calls.length = 0;
  return stub;
};

/** `n` more variants of the seeded product, with fixed ids. */
const addVariants = (stub: Awaited<ReturnType<typeof world>>, n: number): Uuid[] =>
  Array.from({ length: n }, (_, i) => {
    const id = `e${String(i).padStart(7, "0")}-0000-4000-8000-000000000000` as Uuid;
    stub.state.variants.push({
      id,
      business_id: BUSINESS_A,
      product_id: CATALOG_IDS.product,
      axis_values: [`V${i}`],
      sku_suffix: `V${i}`,
      stock: 1,
      minimum_stock: 0,
      created_at: new Date(FROZEN_TEST_NOW),
      updated_at: new Date(FROZEN_TEST_NOW),
    });
    return id;
  });

const count = (stub: Awaited<ReturnType<typeof world>>, re: RegExp): number =>
  stub.calls.filter((c) => re.test(c.text)).length;

beforeEach(() => setTestClock(FROZEN_TEST_NOW));
afterEach(() => resetTestClock());

describe("checkLinks (BR1.1, S34)", () => {
  test("the business's own customer and variants pass; nothing linked runs no query", async () => {
    const stub = await world();
    expect(await checkLinks(stub.sql, ctx, null, [null, null])).toEqual({
      ok: true,
      value: undefined,
    });
    expect(stub.calls).toHaveLength(0);
    const r = await checkLinks(stub.sql, ctx, CATALOG_IDS.customer, [
      CATALOG_IDS.variant,
      null,
      CATALOG_IDS.variant2,
      CATALOG_IDS.variant,
    ]);
    expect(r.ok).toBe(true);
    expect([count(stub, CUSTOMER_QUERY), count(stub, VARIANT_QUERY)]).toEqual([1, 1]);
    // The lookup carries the two distinct ids, once each.
    const sent = stub.calls.find((c) => VARIANT_QUERY.test(c.text))?.params[1];
    expect(sent).toEqual([CATALOG_IDS.variant, CATALOG_IDS.variant2]);
  });

  test("another business's, a missing and a non-UUID customer are not_found; a non-UUID needs no SQL", async () => {
    const stub = await world();
    const foreign = "f1000000-0000-4000-8000-0000000000f1";
    stub.state.customers.push({
      ...stub.state.customers[0],
      id: foreign,
      business_id: BUSINESS_B,
    });
    expect(await checkLinks(stub.sql, ctx, foreign, [])).toEqual({
      ok: false,
      error: { kind: "not_found", entity: "Customer", id: foreign },
    });
    // The same customer is found by its own business.
    expect((await checkLinks(stub.sql, ctxFor(BUSINESS_B, OWNER_A), foreign, [])).ok).toBe(true);
    expect((await checkLinks(stub.sql, ctx, MISSING, [])).ok).toBe(false);
    stub.calls.length = 0;
    expect(await checkLinks(stub.sql, ctx, "রিনা আপা", [CATALOG_IDS.variant])).toEqual({
      ok: false,
      error: { kind: "not_found", entity: "Customer", id: "রিনা আপা" },
    });
    expect(stub.calls).toHaveLength(0);
  });

  test("a non-UUID variant is not_found before any SQL; one missing among five names that id", async () => {
    const stub = await world();
    expect(
      await checkLinks(stub.sql, ctx, CATALOG_IDS.customer, [CATALOG_IDS.variant, "KRT-M"]),
    ).toEqual({ ok: false, error: { kind: "not_found", entity: "Variant", id: "KRT-M" } });
    // The customer was checked (one query); the variants never reached SQL.
    expect([count(stub, CUSTOMER_QUERY), count(stub, VARIANT_QUERY)]).toEqual([1, 0]);
    const ids = addVariants(stub, 4);
    const r = await checkLinks(stub.sql, ctx, null, [ids[0]!, ids[1]!, MISSING, ids[2]!, ids[3]!]);
    expect(r).toEqual({ ok: false, error: { kind: "not_found", entity: "Variant", id: MISSING } });
  });

  test("variants are checked in chunks of at most 50: 50 → 1 query, 51 → 2, 200 → 4", async () => {
    const stub = await world();
    const ids = addVariants(stub, 200);
    for (const [n, queries] of [
      [50, 1],
      [51, 2],
      [200, 4],
    ] as const) {
      stub.calls.length = 0;
      expect((await checkLinks(stub.sql, ctx, null, ids.slice(0, n))).ok).toBe(true);
      expect({ n, queries: count(stub, VARIANT_QUERY) }).toEqual({ n, queries });
      for (const c of stub.calls.filter((x) => VARIANT_QUERY.test(x.text))) {
        expect((c.params[1] as string[]).length).toBeLessThanOrEqual(50);
      }
    }
    // An id missing only from the second chunk is still found missing.
    const r = await checkLinks(stub.sql, ctx, null, [...ids.slice(0, 50), MISSING]);
    expect(!r.ok && r.error.id).toBe(MISSING);
  });

  test("a variant id in upper case is the same variant", async () => {
    const stub = await world();
    expect((await checkLinks(stub.sql, ctx, null, [CATALOG_IDS.variant.toUpperCase()])).ok).toBe(
      true,
    );
  });
});

describe("createOrder with links (AC4.1.1, AC4.1.2, NFR7.29)", () => {
  test("a linked customer and variants are stored as sent; contact and prices are the person's", async () => {
    const stub = await world();
    const r = await createOrder(
      stub.sql,
      ctx,
      createInput({
        customerId: CATALOG_IDS.customer,
        items: [itemInput({ variantId: CATALOG_IDS.variant, unitPricePaise: 99_000 })],
      }),
    );
    if (!r.ok) throw new Error(JSON.stringify(r.error));
    expect(r.value.customerId).toBe(CATALOG_IDS.customer);
    expect(r.value.items[0]).toMatchObject({
      variantId: CATALOG_IDS.variant,
      description: "কালো কুর্তি M",
      unitPricePaise: 99_000,
    });
    expect(r.value.contact?.name).toBe("ফারজানা আক্তার");
  });

  test("a foreign or missing link is not_found: no order, no line, no change-log row, no order number", async () => {
    const stub = await world();
    for (const input of [
      createInput({ customerId: MISSING }),
      createInput({ customerId: "free text" }),
      createInput({
        items: [
          itemInput({ variantId: CATALOG_IDS.variant }),
          itemInput({ variantId: MISSING }),
          itemInput({ variantId: CATALOG_IDS.variant2 }),
        ],
      }),
    ]) {
      const r = await createOrder(stub.sql, ctx, input);
      expect(r.ok ? "ok" : r.error.kind).toBe("not_found");
    }
    expect([stub.state.orders.length, stub.state.orderItems.length]).toEqual([0, 0]);
    expect(stub.state.auditLog).toHaveLength(0);
    expect(count(stub, /nextval\('orders_order_no_seq'\)/)).toBe(0);
    // The next good order takes the first number.
    const ok = await createOrder(stub.sql, ctx, createInput());
    expect(ok.ok && ok.value.orderNo).toBe("ORD-1001");
  });
});

describe("updateOrder with links (BR4.3, S34 precedence, iteration-2 skip rule)", () => {
  const seed = async () => {
    const stub = await world();
    const r = await createOrder(
      stub.sql,
      ctx,
      createInput({
        customerId: CATALOG_IDS.customer,
        items: [itemInput({ variantId: CATALOG_IDS.variant })],
      }),
    );
    if (!r.ok) throw new Error(JSON.stringify(r.error));
    stub.calls.length = 0;
    return { stub, order: r.value };
  };

  test("order not found, then not editable, then link not found", async () => {
    const { stub, order } = await seed();
    const missing = await updateOrder(stub.sql, ctx, MISSING, { customerId: "bad" });
    expect(!missing.ok && missing.error).toMatchObject({ kind: "not_found", entity: "Order" });
    stub.state.orders[0]!["status"] = "shipped";
    const shipped = await updateOrder(stub.sql, ctx, order.id, { customerId: "bad" });
    expect(!shipped.ok && shipped.error.kind).toBe("not_editable");
    stub.state.orders[0]!["status"] = "new";
    const bad = await updateOrder(stub.sql, ctx, order.id, { customerId: MISSING });
    expect(!bad.ok && bad.error).toEqual({ kind: "not_found", entity: "Customer", id: MISSING });
    const badLine = await updateOrder(stub.sql, ctx, order.id, {
      items: [itemInput({ variantId: MISSING })],
    });
    expect(!badLine.ok && badLine.error).toMatchObject({ kind: "not_found", entity: "Variant" });
    expect(stub.state.auditLog).toHaveLength(1); // only the create's row
  });

  test("an edit of neither customer nor lines runs no catalog query; the same customer is not rechecked", async () => {
    const { stub, order } = await seed();
    expect((await updateOrder(stub.sql, ctx, order.id, { deliveryChargePaise: 7_000 })).ok).toBe(
      true,
    );
    expect(
      (await updateOrder(stub.sql, ctx, order.id, { customerId: CATALOG_IDS.customer })).ok,
    ).toBe(true);
    expect(stub.calls.filter((c) => CATALOG_QUERY.test(c.text))).toEqual([]);
    // Unlinking needs no check either; relinking lines checks them.
    expect((await updateOrder(stub.sql, ctx, order.id, { customerId: null })).ok).toBe(true);
    expect(count(stub, CUSTOMER_QUERY)).toBe(0);
    const relinked = await updateOrder(stub.sql, ctx, order.id, {
      customerId: CATALOG_IDS.customer,
      items: [itemInput({ variantId: CATALOG_IDS.variant2 })],
    });
    expect(relinked.ok && relinked.value.items[0]?.variantId).toBe(CATALOG_IDS.variant2);
    expect([count(stub, CUSTOMER_QUERY), count(stub, VARIANT_QUERY)]).toEqual([1, 1]);
  });

  test("linksToCheck asks only for a changed customer and supplied lines", () => {
    expect(linksToCheck("c", {})).toEqual({ customerId: null, variantIds: [] });
    expect(nothingToCheck(linksToCheck("c", { customerId: "c" }))).toBe(true);
    expect(linksToCheck("c", { customerId: "d" })).toEqual({ customerId: "d", variantIds: [] });
    expect(linksToCheck(null, { items: [{ variantId: null }, { variantId: "v" }] })).toEqual({
      customerId: null,
      variantIds: [null, "v"],
    });
    expect(nothingToCheck(linksToCheck(null, { items: [{ variantId: null }] }))).toBe(true);
  });
});

describe("BR1.2 — orders read the catalog only through C8", () => {
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const full = join(dir, name);
      return statSync(full).isDirectory() ? walk(full) : /\.tsx?$/.test(name) ? [full] : [];
    });

  test("no file in src/orders names a catalog table in SQL, and the B2 stubs are gone", () => {
    const dir = join(import.meta.dir, "..", "..", "src", "orders");
    const files = walk(dir);
    for (const f of files) {
      const text = readFileSync(f, "utf8");
      const named =
        /\b(FROM|JOIN|INTO|UPDATE)\s+(customers|customer_notes|products|variants|suppliers)\b/i;
      expect({ f, named: named.test(text) }).toEqual({ f, named: false });
    }
    expect(files.some((f) => /orders\/(customer|variant)\.ts$/.test(f))).toBe(false);
  });
});
