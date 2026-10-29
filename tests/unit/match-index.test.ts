/**
 * tests/unit/match-index.test.ts — the paste screen's match index (U5 BR5.1; P26, S36, SC11;
 * NFR1.17, NFR6.38; contract C7 amendment E3) on the fail-closed stub.
 *
 * Restated rules:
 *   - only the session's business's products, ordered by name then id, each with its
 *     variants ordered by axis values;
 *   - whole products up to 2 000 variants; `truncated` when any variant is left out;
 *   - the first product is always included, even alone above the cap;
 *   - the answer holds ids, name, SKU, axis names and axis values only: no cost, no stock;
 *   - every signed-in role may read it (business.view).
 */
import { describe, expect, test } from "bun:test";
import { matchIndex, MATCH_INDEX_MAX_VARIANTS } from "../../src/catalog/match-index.js";
import type { Role } from "../../src/data/enums.js";
import { BUSINESS, userIdFor } from "../helpers/server-harness.js";
import { catalogWorld, ctxFor, FOREIGN_BUSINESS } from "../helpers/catalog-fixtures.js";

const AT = new Date("2026-10-27T08:00:00.000Z");
type Stub = Awaited<ReturnType<typeof catalogWorld>>;

let seq = 0;
/** A product with `n` variants (values V000…), straight into the stub's rows. */
const product = (stub: Stub, name: string, n: number, businessId = BUSINESS): string => {
  seq += 1;
  const id = `c4000000-0000-4000-8000-${String(seq).padStart(12, "0")}`;
  stub.state.products.push({
    id,
    business_id: businessId,
    name,
    sku: `SKU-${seq}`,
    category: null,
    selling_price_paise: "120000",
    purchase_cost_paise: "80000",
    default_supplier_id: null,
    axes: [{ name: "সাইজ", values: Array.from({ length: n }, (_, i) => `V${i}`) }],
    created_by: userIdFor("owner"),
    created_at: AT,
    updated_at: AT,
  });
  // Inserted in reverse, so the answer's order is the query's, not the rows'.
  for (let i = n - 1; i >= 0; i -= 1) {
    stub.state.variants.push({
      id: `c5000000-0000-4000-8000-${String(seq * 10_000 + i).padStart(12, "0")}`,
      business_id: businessId,
      product_id: id,
      axis_values: [`V${String(i).padStart(3, "0")}`],
      sku_suffix: `V${i}`,
      stock: 7,
      minimum_stock: 1,
      created_at: AT,
      updated_at: AT,
    });
  }
  return id;
};

const must = <T>(r: { ok: true; value: T } | { ok: false; error: unknown }): T => {
  if (!r.ok) throw new Error(`expected ok, got ${JSON.stringify(r.error)}`);
  return r.value;
};

describe("matchIndex (BR5.1, P26)", () => {
  test("by name then id, variants by axis values; ids, names, SKU and axes only", async () => {
    const stub = await catalogWorld();
    const kurti = product(stub, "Kurti", 2);
    const dupatta = product(stub, "Dupatta", 1);
    const index = must(await matchIndex(stub.sql, ctxFor("owner")));
    expect(index.truncated).toBe(false);
    expect(index.products.map((p) => [p.productId, p.name, p.variants.length])).toEqual([
      [dupatta, "Dupatta", 1],
      [kurti, "Kurti", 2],
    ]);
    expect(index.products[1]?.axisNames).toEqual(["সাইজ"]);
    expect(index.products[1]?.variants.map((v) => v.axisValues)).toEqual([["V000"], ["V001"]]);
    // S36 / NFR1.17: no cost and no stock anywhere in the answer.
    const raw = JSON.stringify(index);
    for (const key of ["purchaseCostPaise", "stock", "sellingPricePaise", "80000"]) {
      expect({ key, present: raw.includes(key) }).toEqual({ key, present: false });
    }
    expect(Object.keys(index.products[0] ?? {}).sort()).toEqual([
      "axisNames",
      "name",
      "productId",
      "sku",
      "variants",
    ]);
  });

  test("only the session's business's products", async () => {
    const stub = await catalogWorld();
    product(stub, "Mine", 1);
    product(stub, "Theirs", 1, FOREIGN_BUSINESS);
    const mine = must(await matchIndex(stub.sql, ctxFor("owner")));
    expect(mine.products.map((p) => p.name)).toEqual(["Mine"]);
    const theirs = must(await matchIndex(stub.sql, ctxFor("owner", FOREIGN_BUSINESS)));
    expect(theirs.products.map((p) => p.name)).toEqual(["Theirs"]);
  });

  test("NFR6.38: whole products up to 2 000 variants, then truncated", async () => {
    expect(MATCH_INDEX_MAX_VARIANTS).toBe(2_000);
    const stub = await catalogWorld();
    // 13 products × 144 variants = 1 872; the 14th would make 2 016 > 2 000.
    for (let i = 0; i < 15; i += 1) product(stub, `P${String(i).padStart(2, "0")}`, 144);
    const index = must(await matchIndex(stub.sql, ctxFor("manager")));
    expect(index.products).toHaveLength(13);
    expect(index.products.reduce((n, p) => n + p.variants.length, 0)).toBe(1_872);
    expect(index.products.every((p) => p.variants.length === 144)).toBe(true);
    expect(index.truncated).toBe(true);
  });

  test("exactly at the cap is not truncated; the cap counts whole products", async () => {
    const stub = await catalogWorld();
    product(stub, "A", 3);
    product(stub, "B", 2);
    expect(must(await matchIndex(stub.sql, ctxFor("owner"), 5)).truncated).toBe(false);
    const cut = must(await matchIndex(stub.sql, ctxFor("owner"), 4));
    expect([cut.products.map((p) => p.name), cut.truncated]).toEqual([["A"], true]);
  });

  test("review R-04: the first product is always included, even alone above the cap", async () => {
    const stub = await catalogWorld();
    product(stub, "Huge", 6);
    product(stub, "Small", 1);
    const index = must(await matchIndex(stub.sql, ctxFor("owner"), 5));
    expect(index.products.map((p) => [p.name, p.variants.length])).toEqual([["Huge", 6]]);
    expect(index.truncated).toBe(true);
  });

  test("an empty catalog is an empty, untruncated index; every role may read it", async () => {
    const stub = await catalogWorld();
    for (const role of [
      "owner",
      "manager",
      "sales_staff",
      "accountant",
    ] as const satisfies ReadonlyArray<Role>) {
      expect(must(await matchIndex(stub.sql, ctxFor(role)))).toEqual({
        products: [],
        truncated: false,
      });
    }
  });
});
