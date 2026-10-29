/**
 * tests/integration/catalog-routes.test.ts — the catalog routes through the real request
 * pipeline on the SQL stub (U4 C7, D1–D13; BR1.1–BR1.4, BR3.1, BR3.3, BR9.2, BR11.2; S26–S28;
 * NFR1.13–NFR1.15).
 *
 * Restated:
 *   - cost (BR9.2, NFR1.14): every product read and write answers `purchaseCostPaise` for
 *     Owner, Manager and Accountant and leaves the KEY OUT for Sales Staff; low-stock,
 *     supplier and customer bodies never carry it;
 *   - each role gets exactly the statuses of the US5.1 table on every write (403 outside);
 *   - a foreign, missing or non-UUID id — in the path or in the body — answers the SAME 404
 *     body, byte for byte (D13, BR11.2);
 *   - an edit is partial (`address: null` clears, omitted fields stay) and a duplicate phone
 *     is a warning naming the earlier customer (BR3.1, BR3.3);
 *   - refusals carry their fields: a bad phone on `phone`, an unknown key under its own path,
 *     a 101-character `q` and `limit=0` on the query;
 *   - SKU taken ignoring case and a note revised twice answer 409 `conflict`.
 */
import { describe, expect, test } from "bun:test";
import { ROLES, type Role } from "../../src/data/enums.js";
import { CATALOG_IDS, productRequest, seedCatalog } from "../helpers/catalog-fixtures.js";
import { makeSqlStub } from "../helpers/sql-stub.js";
import { harness, json, request, seedBusiness } from "../helpers/server-harness.js";

const UNKNOWN = "0f0f0f0f-0f0f-4f0f-8f0f-0f0f0f0f0f0f";
const COST_READERS: ReadonlyArray<Role> = ["owner", "manager", "accountant"];

const world = async () => {
  const stub = makeSqlStub();
  const tokens = await seedBusiness(stub);
  seedCatalog(stub);
  return { h: harness(stub), tokens, stub };
};

/** True when a key named `purchaseCostPaise` appears anywhere in the body. */
const hasCostKey = (value: unknown): boolean => {
  if (Array.isArray(value)) return value.some(hasCostKey);
  if (value === null || typeof value !== "object") return false;
  return Object.entries(value).some(([k, v]) => k === "purchaseCostPaise" || hasCostKey(v));
};

describe("purchase cost reaches only cost readers (BR9.2, S27, NFR1.14)", () => {
  test("every product read and write: key present for cost readers, absent for Sales Staff", async () => {
    const { h, tokens } = await world();
    let sku = 0;
    for (const role of ROLES) {
      const reads = [
        await h.send(request("GET", "/api/products", { token: tokens[role] })),
        await h.send(
          request("GET", `/api/products/${CATALOG_IDS.product}`, { token: tokens[role] }),
        ),
      ];
      for (const r of reads) {
        expect(r.status).toBe(200);
        expect({ role, cost: hasCostKey(await r.json()) }).toEqual({
          role,
          cost: COST_READERS.includes(role),
        });
      }
    }
    // Writes as every role allowed to make them; each answer follows the same rule.
    for (const role of ["owner", "manager"] as const) {
      sku += 1;
      const created = await h.send(
        request("POST", "/api/products", {
          token: tokens[role],
          body: productRequest(`COST-${sku}`),
        }),
      );
      expect(created.status).toBe(201);
      expect(hasCostKey(await created.json())).toBe(true);
      const edited = await h.send(
        request("PATCH", `/api/products/${CATALOG_IDS.product}`, {
          token: tokens[role],
          body: { sellingPricePaise: 100_000 + sku },
        }),
      );
      expect(edited.status).toBe(200);
      expect(hasCostKey(await edited.json())).toBe(true);
    }
    for (const role of COST_READERS) {
      const cost = await h.send(
        request("PATCH", `/api/products/${CATALOG_IDS.product}/cost`, {
          token: tokens[role],
          body: { purchaseCostPaise: 70_000 },
        }),
      );
      expect({ role, status: cost.status, cost: hasCostKey(await cost.json()) }).toEqual({
        role,
        status: 200,
        cost: true,
      });
    }
  });

  test("low-stock, supplier and customer bodies never carry cost, for any role", async () => {
    const { h, tokens } = await world();
    for (const role of ROLES) {
      for (const path of [
        "/api/low-stock",
        "/api/suppliers",
        "/api/customers",
        `/api/customers/${CATALOG_IDS.customer}`,
      ]) {
        const r = await h.send(request("GET", path, { token: tokens[role] }));
        expect({ role, path, status: r.status, cost: hasCostKey(await r.json()) }).toEqual({
          role,
          path,
          status: 200,
          cost: false,
        });
      }
    }
  });
});

describe("statuses per role on the catalog writes (US5.1, NFR1.13)", () => {
  test("customers: Owner, Manager, Sales Staff; products and suppliers: Owner, Manager", async () => {
    const { h, tokens } = await world();
    const writes: ReadonlyArray<readonly [string, string, unknown, ReadonlyArray<Role>, number]> = [
      [
        "POST",
        "/api/customers",
        { name: "X", phone: "01711111111" },
        ["owner", "manager", "sales_staff"],
        201,
      ],
      [
        "POST",
        `/api/customers/${CATALOG_IDS.customer}/notes`,
        { text: "x" },
        ["owner", "manager", "sales_staff"],
        201,
      ],
      ["POST", "/api/suppliers", { name: "S", phone: "01711111111" }, ["owner", "manager"], 201],
      [
        "PATCH",
        `/api/variants/${CATALOG_IDS.variant}/stock`,
        { stock: 7 },
        ["owner", "manager"],
        200,
      ],
      [
        "PATCH",
        `/api/suppliers/${CATALOG_IDS.supplier}`,
        { name: "S2" },
        ["owner", "manager"],
        200,
      ],
    ];
    for (const [method, path, body, allowed, success] of writes) {
      for (const role of ROLES) {
        const r = await h.send(request(method, path, { token: tokens[role], body }));
        expect({ role, method, path, status: r.status }).toEqual({
          role,
          method,
          path,
          status: allowed.includes(role) ? success : 403,
        });
      }
    }
  });
});

describe("one 404 for foreign, missing and non-UUID ids (D13, BR11.2, NFR1.15)", () => {
  test("path ids: every :id route answers byte-identical 404 bodies", async () => {
    const { h, tokens } = await world();
    const routes: ReadonlyArray<readonly [string, string, unknown]> = [
      ["GET", "/api/customers/:id", undefined],
      ["PATCH", "/api/customers/:id", { name: "x" }],
      ["POST", "/api/customers/:id/notes", { text: "x" }],
      ["GET", "/api/products/:id", undefined],
      ["PATCH", "/api/products/:id", { name: "x" }],
      ["PATCH", "/api/products/:id/cost", { purchaseCostPaise: 1 }],
      ["PATCH", "/api/variants/:id/stock", { stock: 1 }],
      ["PATCH", "/api/suppliers/:id", { name: "x" }],
    ];
    const bodies = new Set<string>();
    for (const [method, path, body] of routes) {
      for (const id of [UNKNOWN, "not-a-uuid", "1"]) {
        const r = await h.send(
          request(method, path.replace(":id", id), { token: tokens.owner, body }),
        );
        expect({ method, path, id, status: r.status }).toEqual({ method, path, id, status: 404 });
        bodies.add(await r.text());
      }
    }
    expect([...bodies]).toEqual(['{"error":"not_found"}']);
  });

  test("body ids: a non-UUID or unknown supplier or note is the same 404", async () => {
    const { h, tokens } = await world();
    for (const supplier of ["abc", UNKNOWN]) {
      const r = await h.send(
        request("POST", "/api/products", {
          token: tokens.owner,
          body: productRequest(`SUP-${supplier}`.slice(0, 20), { defaultSupplierId: supplier }),
        }),
      );
      expect({ supplier, status: r.status, body: await r.text() }).toEqual({
        supplier,
        status: 404,
        body: '{"error":"not_found"}',
      });
    }
    for (const note of ["abc", UNKNOWN]) {
      const r = await h.send(
        request("POST", `/api/customers/${CATALOG_IDS.customer}/notes`, {
          token: tokens.owner,
          body: { text: "x", revisesNoteId: note },
        }),
      );
      expect({ note, status: r.status, body: await r.text() }).toEqual({
        note,
        status: 404,
        body: '{"error":"not_found"}',
      });
    }
  });
});

describe("customers over HTTP (BR3.1, BR3.3, BR2.1)", () => {
  test("a duplicate phone is a 201 warning naming the earlier customer", async () => {
    const { h, tokens } = await world();
    const r = await h.send(
      request("POST", "/api/customers", {
        token: tokens.sales_staff,
        body: { name: "বোন", phone: "+880 1712-345678" },
      }),
    );
    expect(r.status).toBe(201);
    const body = await json(r);
    expect(body["duplicatePhoneOf"]).toEqual({ id: CATALOG_IDS.customer, name: "রিনা আক্তার" });
  });

  test("an edit is partial: address null clears it; omitted fields stay", async () => {
    const { h, tokens } = await world();
    await h.send(
      request("PATCH", `/api/customers/${CATALOG_IDS.customer}`, {
        token: tokens.owner,
        body: { address: "ঢাকা" },
      }),
    );
    const r = await h.send(
      request("PATCH", `/api/customers/${CATALOG_IDS.customer}`, {
        token: tokens.owner,
        body: { address: null },
      }),
    );
    const customer = (await json(r))["customer"] as Record<string, unknown>;
    expect(customer).toMatchObject({
      name: "রিনা আক্তার",
      phone: "01712345678",
      address: null,
      riskLevel: 1,
    });
  });

  test("refusals name their fields: phone, an unknown key, q and limit", async () => {
    const { h, tokens } = await world();
    const phone = await h.send(
      request("POST", "/api/customers", { token: tokens.owner, body: { name: "X", phone: "123" } }),
    );
    expect([phone.status, await json(phone)]).toEqual([
      400,
      {
        error: "invalid_input",
        fields: [{ path: "phone", message: "not a Bangladeshi mobile number" }],
      },
    ]);
    const smuggled = await h.send(
      request("POST", "/api/customers", {
        token: tokens.owner,
        body: { name: "X", phone: "01711111111", businessId: UNKNOWN },
      }),
    );
    expect(smuggled.status).toBe(400);
    expect(JSON.stringify(await smuggled.json())).toContain('"path":"businessId"');
    for (const query of [`q=${"x".repeat(101)}`, "limit=0", "limit=abc", "cursor=%25%25"]) {
      const r = await h.send(request("GET", `/api/customers?${query}`, { token: tokens.owner }));
      expect({ query, status: r.status }).toEqual({ query, status: 400 });
    }
  });
});

describe("conflicts (BR6.2, BR4.3)", () => {
  test("a SKU taken ignoring case and a note revised twice answer 409 conflict", async () => {
    const { h, tokens } = await world();
    const sku = await h.send(
      request("POST", "/api/products", { token: tokens.owner, body: productRequest("kurti-seed") }),
    );
    expect([sku.status, await json(sku)]).toEqual([409, { error: "conflict" }]);
    const first = await h.send(
      request("POST", `/api/customers/${CATALOG_IDS.customer}/notes`, {
        token: tokens.owner,
        body: { text: "সংশোধন", revisesNoteId: CATALOG_IDS.note },
      }),
    );
    expect(first.status).toBe(201);
    const second = await h.send(
      request("POST", `/api/customers/${CATALOG_IDS.customer}/notes`, {
        token: tokens.owner,
        body: { text: "আবার", revisesNoteId: CATALOG_IDS.note },
      }),
    );
    expect([second.status, await json(second)]).toEqual([409, { error: "conflict" }]);
  });

  test("a product edit refuses SKU, axes and cost as unknown keys (BR6.7)", async () => {
    const { h, tokens } = await world();
    for (const body of [{ sku: "X" }, { axes: [] }, { purchaseCostPaise: 1 }]) {
      const r = await h.send(
        request("PATCH", `/api/products/${CATALOG_IDS.product}`, { token: tokens.owner, body }),
      );
      expect({ body, status: r.status }).toEqual({ body, status: 400 });
    }
  });
});
