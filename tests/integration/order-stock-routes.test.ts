/**
 * tests/integration/order-stock-routes.test.ts — stock deduction over HTTP, through the real
 * pipeline on the fail-closed stub (POST /api/orders/:id/status; migration 0024).
 *
 * Restated rules:
 *   - packing an order whose linked variant has too little stock answers 409
 *     `insufficient_stock` with one field per short variant (`stock.<SKU>`,
 *     `required N, available M`) and changes neither the status nor the stock;
 *   - packing within stock answers 200 and the variant's stock drops by the line quantity;
 *   - cancelling the packed order puts it back.
 * Seeded variant KURTI-SEED-M has stock 1.
 */
import { describe, expect, test } from "bun:test";
import { OrderResponseSchema } from "../../src/orders/schemas.js";
import { CATALOG_IDS, seedCatalog } from "../helpers/catalog-fixtures.js";
import { harness, json, request, seedBusiness } from "../helpers/server-harness.js";
import { makeSqlStub } from "../helpers/sql-stub.js";

const world = async () => {
  const stub = makeSqlStub();
  const tokens = await seedBusiness(stub);
  seedCatalog(stub);
  return { h: harness(stub), stub, tokens };
};

const orderOf = (quantity: number) => ({
  source: "manual",
  customerId: CATALOG_IDS.customer,
  contact: null,
  repeatOfOrderId: null,
  items: [
    {
      variantId: CATALOG_IDS.variant,
      description: "কুর্তি M",
      quantity,
      unitPricePaise: 120_000,
      lineDiscountPaise: 0,
    },
  ],
  orderDiscountPaise: 0,
  deliveryChargePaise: 0,
});

const stockM = (stub: ReturnType<typeof makeSqlStub>): number =>
  Number(stub.state.variants.find((v) => v["id"] === CATALOG_IDS.variant)?.["stock"]);

describe("POST /api/orders/:id/status moves stock", () => {
  test("too little stock: 409 insufficient_stock naming the SKU; nothing changes", async () => {
    const { h, stub, tokens } = await world();
    const created = OrderResponseSchema.parse(
      await json(
        await h.send(request("POST", "/api/orders", { token: tokens.owner, body: orderOf(2) })),
      ),
    );
    const to = (status: string) =>
      h.send(
        request("POST", `/api/orders/${created.id}/status`, {
          token: tokens.manager,
          body: { to: status },
        }),
      );
    expect((await to("confirmed")).status).toBe(200);
    const refused = await to("packed");
    expect(refused.status).toBe(409);
    const body = (await json(refused)) as Record<string, unknown>;
    expect({ error: body["error"], fields: body["fields"] }).toEqual({
      error: "insufficient_stock",
      fields: [{ path: "stock.KURTI-SEED-M", message: "required 2, available 1" }],
    });
    expect(stockM(stub)).toBe(1);
    expect(stub.state.orders.find((o) => o["id"] === created.id)?.["status"]).toBe("confirmed");
  });

  test("within stock: 200, stock drops; cancelling puts it back", async () => {
    const { h, stub, tokens } = await world();
    const created = OrderResponseSchema.parse(
      await json(
        await h.send(request("POST", "/api/orders", { token: tokens.owner, body: orderOf(1) })),
      ),
    );
    for (const status of ["confirmed", "packed"]) {
      const r = await h.send(
        request("POST", `/api/orders/${created.id}/status`, {
          token: tokens.owner,
          body: { to: status },
        }),
      );
      expect({ status, code: r.status }).toEqual({ status, code: 200 });
    }
    expect(stockM(stub)).toBe(0);
    const cancelled = await h.send(
      request("POST", `/api/orders/${created.id}/status`, {
        token: tokens.owner,
        body: { to: "cancelled" },
      }),
    );
    expect(cancelled.status).toBe(200);
    expect(stockM(stub)).toBe(1);
  });
});
