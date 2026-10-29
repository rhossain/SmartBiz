/**
 * tests/integration/orders-catalog-routes.test.ts — the order routes with catalog links and
 * the match index over HTTP, through the real pipeline on the fail-closed stub (U5 BR1.1,
 * BR3.1, BR4.3, BR5.1; S34, S36, S37; NFR1.16–NFR1.18; contract C3 amendments E1, E2, E5,
 * C7 amendment E3; AC4.1.1, AC4.1.2, AC4.2.1).
 *
 * Restated rules:
 *   - Owner, Manager and Sales Staff create and edit linked orders (201 / 200); the
 *     Accountant is refused (403) before any link is looked at;
 *   - a foreign, a missing and a non-UUID customer or variant id answer the SAME 404 body,
 *     naming the request field (`customerId`, `items.<n>.variantId`), and write nothing;
 *   - on an edit: order not found, then not editable (409), then link not found;
 *   - the list shows the linked customer's and variants' current names; the detail adds
 *     `customerName` and per-line `label`;
 *   - `GET /api/catalog/match-index` answers every role, only the session's business, with
 *     no `purchaseCostPaise` and no `stock` key.
 * The role walks, the no-secret walk and the header test read the route from the role table.
 */
import { describe, expect, test } from "bun:test";
import { MatchIndexResponseSchema } from "../../src/catalog/schemas.js";
import type { Role } from "../../src/data/enums.js";
import { OrderResponseSchema, OrdersPageResponseSchema } from "../../src/orders/schemas.js";
import { CATALOG_IDS, seedCatalog } from "../helpers/catalog-fixtures.js";
import { BUSINESS_B } from "../helpers/order-fixtures.js";
import { harness, json, request, seedBusiness } from "../helpers/server-harness.js";
import { makeSqlStub } from "../helpers/sql-stub.js";

const FOREIGN_CUSTOMER = "f1000000-0000-4000-8000-0000000000f1";
const FOREIGN_VARIANT = "f5000000-0000-4000-8000-0000000000f5";
const MISSING = "d0000000-0000-4000-8000-0000000000d0";

/** The harness business with its catalog, plus one customer and variant of another business. */
const world = async () => {
  const stub = makeSqlStub();
  const tokens = await seedBusiness(stub);
  seedCatalog(stub);
  stub.state.customers.push({
    ...stub.state.customers[0],
    id: FOREIGN_CUSTOMER,
    business_id: BUSINESS_B,
  });
  stub.state.variants.push({
    ...stub.state.variants[0],
    id: FOREIGN_VARIANT,
    business_id: BUSINESS_B,
  });
  return { h: harness(stub), stub, tokens };
};

const order = (over: Record<string, unknown> = {}) => ({
  source: "manual",
  customerId: CATALOG_IDS.customer,
  contact: { name: "রিনা", phone: "01712345678", address: null },
  repeatOfOrderId: null,
  items: [
    {
      variantId: CATALOG_IDS.variant,
      description: "কুর্তি M",
      quantity: 2,
      unitPricePaise: 120_000,
      lineDiscountPaise: 0,
    },
    {
      variantId: null,
      description: "ওড়না",
      quantity: 1,
      unitPricePaise: 30_000,
      lineDiscountPaise: 0,
    },
  ],
  orderDiscountPaise: 0,
  deliveryChargePaise: 6_000,
  ...over,
});

const line = (variantId: string | null) => ({
  variantId,
  description: "কুর্তি",
  quantity: 1,
  unitPricePaise: 1_000,
  lineDiscountPaise: 0,
});

describe("create and edit with links (E1, BR1.1, NFR1.18)", () => {
  test("Owner, Manager and Sales Staff create a linked order; the Accountant is refused", async () => {
    const { h, tokens } = await world();
    for (const role of ["owner", "manager", "sales_staff"] as const satisfies ReadonlyArray<Role>) {
      const r = await h.send(
        request("POST", "/api/orders", { token: tokens[role], body: order() }),
      );
      expect({ role, status: r.status }).toEqual({ role, status: 201 });
      const body = OrderResponseSchema.parse(await r.json());
      expect(body.customerId).toBe(CATALOG_IDS.customer);
      expect(body.customerName).toBe("রিনা আক্তার");
      expect(body.items.map((i) => [i.variantId, i.description, i.label])).toEqual([
        [CATALOG_IDS.variant, "কুর্তি M", "সুতির কুর্তি · M"],
        [null, "ওড়না", "ওড়না"],
      ]);
    }
    const refused = await h.send(
      request("POST", "/api/orders", {
        token: tokens.accountant,
        body: order({ customerId: "x" }),
      }),
    );
    expect(refused.status).toBe(403);
  });

  test("foreign, missing and non-UUID ids answer one 404 body naming the field; nothing is written", async () => {
    const { h, stub, tokens } = await world();
    const bodies = new Set<string>();
    for (const id of [FOREIGN_CUSTOMER, MISSING, "রিনা আপা"]) {
      const r = await h.send(
        request("POST", "/api/orders", {
          token: tokens.sales_staff,
          body: order({ customerId: id }),
        }),
      );
      expect({ id, status: r.status }).toEqual({ id, status: 404 });
      bodies.add(await r.text());
    }
    expect([...bodies]).toEqual([
      '{"error":"not_found","fields":[{"path":"customerId","message":"not found"}]}',
    ]);
    bodies.clear();
    for (const id of [FOREIGN_VARIANT, MISSING, "KRT-M"]) {
      const r = await h.send(
        request("POST", "/api/orders", {
          token: tokens.owner,
          body: order({ items: [line(CATALOG_IDS.variant), line(id), line(id)] }),
        }),
      );
      expect({ id, status: r.status }).toEqual({ id, status: 404 });
      bodies.add(await r.text());
    }
    expect([...bodies]).toEqual([
      '{"error":"not_found","fields":[{"path":"items.1.variantId","message":"not found"},{"path":"items.2.variantId","message":"not found"}]}',
    ]);
    expect([stub.state.orders.length, stub.state.orderItems.length]).toEqual([0, 0]);
    expect(stub.state.auditLog.filter((a) => String(a["action"]).startsWith("order."))).toEqual([]);
  });

  test("an edit: not editable comes before a bad link; a bad link names its field; a good one relinks", async () => {
    const { h, stub, tokens } = await world();
    const created = OrderResponseSchema.parse(
      await json(
        await h.send(request("POST", "/api/orders", { token: tokens.owner, body: order() })),
      ),
    );
    const patch = (body: unknown) =>
      h.send(request("PATCH", `/api/orders/${created.id}`, { token: tokens.manager, body }));

    const badCustomer = await patch({ customerId: FOREIGN_CUSTOMER });
    expect([badCustomer.status, await json(badCustomer)]).toEqual([
      404,
      { error: "not_found", fields: [{ path: "customerId", message: "not found" }] },
    ]);
    const badLine = await patch({ items: [line(null), line(FOREIGN_VARIANT)] });
    expect([badLine.status, await json(badLine)]).toEqual([
      404,
      { error: "not_found", fields: [{ path: "items.1.variantId", message: "not found" }] },
    ]);
    const relinked = await patch({ items: [line(CATALOG_IDS.variant2)], customerId: null });
    expect(relinked.status).toBe(200);
    const body = OrderResponseSchema.parse(await relinked.json());
    expect([body.customerId, body.customerName, body.items[0]?.label]).toEqual([
      null,
      "রিনা",
      "সুতির কুর্তি · L",
    ]);

    stub.state.orders[0]!["status"] = "packed";
    const late = await patch({ customerId: FOREIGN_CUSTOMER });
    expect([late.status, (await json(late))["error"]]).toEqual([409, "not_editable"]);
    const missing = await h.send(
      request("PATCH", `/api/orders/${MISSING}`, {
        token: tokens.manager,
        body: { customerId: FOREIGN_CUSTOMER },
      }),
    );
    expect([missing.status, await json(missing)]).toEqual([404, { error: "not_found" }]);
  });
});

describe("names on the list and the detail (E2, E5, BR3.1)", () => {
  test("the list shows the catalog's current names, with free-text fallbacks", async () => {
    const { h, stub, tokens } = await world();
    await h.send(request("POST", "/api/orders", { token: tokens.owner, body: order() }));
    await h.send(
      request("POST", "/api/orders", {
        token: tokens.owner,
        body: order({ customerId: null, items: [line(null)] }),
      }),
    );
    stub.state.customers[0]!["name"] = "রিনা বেগম";
    const r = await h.send(request("GET", "/api/orders", { token: tokens.accountant }));
    const page = OrdersPageResponseSchema.parse(await r.json());
    // The two orders may share a millisecond, so read them in creation order (order number).
    const byNumber = [...page.orders].sort((a, b) => a.orderNo.localeCompare(b.orderNo));
    expect(byNumber.map((o) => [o.customerName, o.itemLabels])).toEqual([
      ["রিনা বেগম", ["সুতির কুর্তি · M", "ওড়না"]],
      ["রিনা", ["কুর্তি"]],
    ]);
    // AC3.3.2, BR3.2: the customer's history filter finds the linked order.
    const history = OrdersPageResponseSchema.parse(
      await json(
        await h.send(
          request("GET", `/api/orders?customerId=${CATALOG_IDS.customer}`, {
            token: tokens.sales_staff,
          }),
        ),
      ),
    );
    expect(history.orders.map((o) => o.customerName)).toEqual(["রিনা বেগম"]);
  });

  test("the detail and a status transition answer the names", async () => {
    const { h, tokens } = await world();
    const created = OrderResponseSchema.parse(
      await json(
        await h.send(request("POST", "/api/orders", { token: tokens.owner, body: order() })),
      ),
    );
    const detail = OrderResponseSchema.parse(
      await json(
        await h.send(request("GET", `/api/orders/${created.id}`, { token: tokens.accountant })),
      ),
    );
    expect([detail.customerName, detail.items.map((i) => i.label)]).toEqual([
      "রিনা আক্তার",
      ["সুতির কুর্তি · M", "ওড়না"],
    ]);
    const moved = OrderResponseSchema.parse(
      await json(
        await h.send(
          request("POST", `/api/orders/${created.id}/status`, {
            token: tokens.owner,
            body: { to: "confirmed" },
          }),
        ),
      ),
    );
    expect(moved.customerName).toBe("রিনা আক্তার");
  });
});

describe("GET /api/catalog/match-index (E3, S36, NFR1.17)", () => {
  test("every role reads it; only this business's products; no cost and no stock", async () => {
    const { h, stub, tokens } = await world();
    stub.state.products.push({
      ...stub.state.products[0],
      id: "f4000000-0000-4000-8000-0000000000f4",
      business_id: BUSINESS_B,
      name: "অন্য দোকান",
    });
    for (const role of ["owner", "manager", "sales_staff", "accountant"] as const) {
      const r = await h.send(request("GET", "/api/catalog/match-index", { token: tokens[role] }));
      expect({ role, status: r.status }).toEqual({ role, status: 200 });
      const raw = await r.text();
      expect(raw).not.toContain("purchaseCostPaise");
      expect(raw).not.toContain('"stock"');
      expect(raw).not.toContain("অন্য দোকান");
      const body = MatchIndexResponseSchema.parse(JSON.parse(raw));
      expect(body).toEqual({
        products: [
          {
            productId: CATALOG_IDS.product,
            name: "সুতির কুর্তি",
            sku: "KURTI-SEED",
            axisNames: ["সাইজ"],
            variants: [
              { variantId: CATALOG_IDS.variant2, axisValues: ["L"] },
              { variantId: CATALOG_IDS.variant, axisValues: ["M"] },
            ],
          },
        ],
        truncated: false,
      });
    }
  });

  test("no session is 401; an unknown query key is 400", async () => {
    const { h, tokens } = await world();
    expect((await h.send(request("GET", "/api/catalog/match-index"))).status).toBe(401);
    const bad = await h.send(
      request("GET", "/api/catalog/match-index?q=x", { token: tokens.owner }),
    );
    expect(bad.status).toBe(400);
  });
});
