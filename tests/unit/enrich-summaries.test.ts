/**
 * tests/unit/enrich-summaries.test.ts — catalog names on the order list and the order detail
 * (U5 BR3.1, BR3.2; P25, P28; NFR6.37; contract C3 amendments E2, E5) on the fail-closed stub.
 *
 * Restated rules:
 *   - customerName = the linked customer's CURRENT name, else the contact's name, else null;
 *   - itemLabels[i] = the linked variant's label "product · value · value", else the line's
 *     description, in line order;
 *   - names come only from the session's business (another business's ids fall back);
 *   - a 50-order page with 100 distinct variants and one customer costs 1 customer query and
 *     2 variant queries (chunks of at most 50 ids);
 *   - the detail gets `customerName` and a per-item `label`, computed the same way.
 */
import { describe, expect, test } from "bun:test";
import type { Uuid } from "../../src/data/uuid.js";
import { enrichSummaries, withNames } from "../../src/orders/enrich-summaries.js";
import { toOrderSummary } from "../../src/orders/order-summary.js";
import type { Order, OrderItem } from "../../src/orders/types.js";
import { CATALOG_IDS, catalogWorld, seedCatalog } from "../helpers/catalog-fixtures.js";
import { BUSINESS_A, BUSINESS_B, OWNER_A, ctxFor } from "../helpers/order-fixtures.js";

const ctx = ctxFor(BUSINESS_A, OWNER_A);
const AT = "2026-10-27T08:00:00.000Z";

const CUSTOMER_LOOKUP = /SELECT id, name FROM customers\s+WHERE business_id = \? AND id = ANY/;
const VARIANT_LOOKUP = /FROM variants v\s+JOIN products p[\s\S]*v\.id = ANY/;

let seq = 0;
const line = (variantId: string | null, description: string): OrderItem => {
  seq += 1;
  return {
    id: `0e000000-0000-4000-8000-${String(seq).padStart(12, "0")}` as Uuid,
    orderId: "0f000000-0000-4000-8000-000000000000" as Uuid,
    businessId: BUSINESS_A,
    lineNo: 1,
    variantId,
    description,
    quantity: 1,
    unitPricePaise: 1_000,
    lineDiscountPaise: 0,
  };
};

const order = (over: Partial<Order> = {}): Order => {
  seq += 1;
  return {
    id: `0f000000-0000-4000-8000-${String(seq).padStart(12, "0")}` as Uuid,
    businessId: BUSINESS_A,
    orderNo: `ORD-${1000 + seq}`,
    customerId: null,
    contact: { name: "যোগাযোগের নাম", phone: "01711111111", address: null },
    status: "new",
    source: "manual",
    repeatOfOrderId: null,
    itemsRevision: 1,
    items: [line(null, "নিজের লেখা")],
    orderDiscountPaise: 0,
    deliveryChargePaise: 0,
    totalPaise: 1_000,
    createdBy: OWNER_A,
    createdAt: AT,
    updatedAt: AT,
    ...over,
  };
};

const world = async () => {
  const stub = await catalogWorld();
  seedCatalog(stub);
  stub.calls.length = 0;
  return stub;
};

describe("enrichSummaries (BR3.1, E2)", () => {
  test("linked names win; contact name and description are the fallbacks; else null", async () => {
    const stub = await world();
    const rows = await enrichSummaries(stub.sql, ctx, [
      order({
        customerId: CATALOG_IDS.customer,
        items: [line(CATALOG_IDS.variant, "কুর্তি M"), line(null, "ওড়না")],
      }),
      order(),
      order({ contact: null }),
    ]);
    expect(rows.map((r) => [r.customerName, r.itemLabels])).toEqual([
      ["রিনা আক্তার", ["সুতির কুর্তি · M", "ওড়না"]],
      ["যোগাযোগের নাম", ["নিজের লেখা"]],
      [null, ["নিজের লেখা"]],
    ]);
  });

  test("the CURRENT name is shown: a renamed customer reads with its new name", async () => {
    const stub = await world();
    const linked = order({ customerId: CATALOG_IDS.customer });
    stub.state.customers[0]!["name"] = "রিনা বেগম";
    const [row] = await enrichSummaries(stub.sql, ctx, [linked]);
    expect(row?.customerName).toBe("রিনা বেগম");
  });

  test("another business's customer and variant are never named; the row falls back", async () => {
    const stub = await world();
    const [row] = await enrichSummaries(stub.sql, ctxFor(BUSINESS_B, OWNER_A), [
      order({
        businessId: BUSINESS_B,
        customerId: CATALOG_IDS.customer,
        items: [line(CATALOG_IDS.variant, "কুর্তি M")],
      }),
    ]);
    expect([row?.customerName, row?.itemLabels]).toEqual(["যোগাযোগের নাম", ["কুর্তি M"]]);
  });

  test("NFR6.37: a 50-order page with 100 distinct variants costs 1 customer and 2 variant queries", async () => {
    const stub = await world();
    const variantIds = Array.from({ length: 100 }, (_, i) => {
      const id = `e${String(i).padStart(7, "0")}-0000-4000-8000-000000000000`;
      stub.state.variants.push({
        id,
        business_id: BUSINESS_A,
        product_id: CATALOG_IDS.product,
        axis_values: [`V${i}`],
        sku_suffix: `V${i}`,
        stock: 1,
        minimum_stock: 0,
        created_at: new Date(AT),
        updated_at: new Date(AT),
      });
      return id;
    });
    const page = Array.from({ length: 50 }, (_, i) =>
      order({
        customerId: CATALOG_IDS.customer,
        items: [line(variantIds[2 * i]!, "a"), line(variantIds[2 * i + 1]!, "b")],
      }),
    );
    stub.calls.length = 0;
    const rows = await enrichSummaries(stub.sql, ctx, page);
    expect(stub.calls.filter((c) => CUSTOMER_LOOKUP.test(c.text))).toHaveLength(1);
    expect(stub.calls.filter((c) => VARIANT_LOOKUP.test(c.text))).toHaveLength(2);
    expect(stub.calls).toHaveLength(3);
    expect(rows[49]?.itemLabels).toEqual(["সুতির কুর্তি · V98", "সুতির কুর্তি · V99"]);
  });

  test("a page with nothing linked asks the catalog nothing; non-UUID ids are never sent", async () => {
    const stub = await world();
    const rows = await enrichSummaries(stub.sql, ctx, [
      order(),
      order({ customerId: "free text", items: [line("KRT-M", "কুর্তি")] }),
    ]);
    expect(stub.calls).toHaveLength(0);
    expect(rows[1]?.itemLabels).toEqual(["কুর্তি"]);
  });
});

describe("withNames (E5) and the pure map", () => {
  test("the detail carries customerName and a label per line, as the list computes them", async () => {
    const stub = await world();
    const o = order({
      customerId: CATALOG_IDS.customer,
      items: [line(CATALOG_IDS.variant2, "কুর্তি L"), line(null, "ওড়না")],
    });
    const named = await withNames(stub.sql, ctx, o);
    expect(named.customerName).toBe("রিনা আক্তার");
    expect(named.items.map((i) => i.label)).toEqual(["সুতির কুর্তি · L", "ওড়না"]);
    // The order itself is unchanged: its own contact and descriptions stay (BR1.3).
    expect(named.contact).toEqual(o.contact);
    expect(named.items.map((i) => i.description)).toEqual(["কুর্তি L", "ওড়না"]);
  });

  test("toOrderSummary without names keeps the B2 fallbacks", () => {
    const o = order({ items: [line("v", "এক"), line(null, "দুই")] });
    expect(toOrderSummary(o)).toMatchObject({
      customerName: "যোগাযোগের নাম",
      itemLabels: ["এক", "দুই"],
    });
  });
});
