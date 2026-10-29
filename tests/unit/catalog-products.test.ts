/**
 * tests/unit/catalog-products.test.ts — products and variants on the fail-closed stub (U4 W6,
 * W7; BR6.1–BR6.8, BR8.2, BR9.2, BR10.1, BR10.2; R15, R16, R20; P19, P21; S27; NFR1.14;
 * C8 getVariant / variantLabels).
 *
 * Restated: a product and all its variants are written in one transaction after its
 * change-log row, the variants in ONE statement; a SKU taken ignoring case is 409; the
 * variants must be the cross product; another business's supplier is 404; only Owner and
 * Manager write products; the edit takes only name, category, price and supplier and writes
 * nothing when nothing changed; a failure after the product insert leaves nothing behind;
 * the list counts variants, stock and low variants for the page only.
 * S27 (the named mutant "productView always adds the cost"): the cost key is PRESENT for
 * Owner, Manager and Accountant and ABSENT — not null — for Sales Staff.
 */
import { describe, expect, test } from "bun:test";
import { variantLabels, getVariant } from "../../src/catalog/index.js";
import {
  createProduct,
  getProduct,
  listProducts,
  productView,
  summaryView,
  updateProduct,
} from "../../src/catalog/products.js";
import { createSupplier } from "../../src/catalog/suppliers.js";
import { ROLES } from "../../src/data/enums.js";
import type { Uuid } from "../../src/data/uuid.js";
import {
  auditRows,
  callIndex,
  catalogWorld,
  ctxFor,
  FOREIGN_BUSINESS,
  productRequest,
} from "../helpers/catalog-fixtures.js";

const owner = ctxFor("owner");
const manager = ctxFor("manager");

const must = <T>(r: { ok: true; value: T } | { ok: false; error: unknown }): T => {
  if (!r.ok) throw new Error(`expected ok, got ${JSON.stringify(r.error)}`);
  return r.value;
};

describe("createProduct (W6)", () => {
  test("change-log row, product, then every variant in one statement, in axis order", async () => {
    const stub = await catalogWorld();
    const p = must(await createProduct(stub.sql, manager, productRequest("KURTI-1") as never));
    expect(p.variants.map((v) => v.fullSku)).toEqual([
      "KURTI-1-M-লাল",
      "KURTI-1-M-নীল",
      "KURTI-1-L-লাল",
      "KURTI-1-L-নীল",
    ]);
    expect(p.variants.map((v) => v.low)).toEqual([false, true, false, false]);
    expect(stub.state.variants).toHaveLength(4);
    expect(stub.calls.filter((c) => /INSERT INTO variants/.test(c.text))).toHaveLength(1);
    const audit = callIndex(stub, /INSERT INTO audit_log/);
    expect(audit).toBeLessThan(callIndex(stub, /INSERT INTO products/));
    expect(callIndex(stub, /INSERT INTO products/)).toBeLessThan(
      callIndex(stub, /INSERT INTO variants/),
    );
    expect(auditRows(stub)).toEqual([
      {
        action: "product.create",
        subjectKind: "product",
        subjectId: p.id,
        payload: {
          sku: "KURTI-1",
          variantCount: 4,
          axisCount: 2,
          sellingPricePaise: 120_000,
          purchaseCostPaise: 80_000,
        },
      },
    ]);
  });

  test("a product with no axes has exactly one variant whose full SKU is the SKU", async () => {
    const stub = await catalogWorld();
    const p = must(
      await createProduct(
        stub.sql,
        owner,
        productRequest("SOAP", {
          axes: [],
          variants: [{ axisValues: [], stock: 3, minimumStock: 1 }],
          purchaseCostPaise: null,
        }) as never,
      ),
    );
    expect(p.variants.map((v) => [v.skuSuffix, v.fullSku])).toEqual([["", "SOAP"]]);
    expect(p.purchaseCostPaise).toBeNull();
  });

  test("a SKU taken ignoring case is a conflict and nothing more is written (BR6.2, R16)", async () => {
    const stub = await catalogWorld();
    must(await createProduct(stub.sql, owner, productRequest("KURTI-1") as never));
    const audits = stub.state.auditLog.length;
    const r = await createProduct(stub.sql, owner, productRequest("kurti-1") as never);
    expect(r.ok ? null : r.error).toEqual({ kind: "conflict", reason: "sku_taken" });
    expect(stub.state.products).toHaveLength(1);
    expect(stub.state.auditLog.length).toBe(audits);
  });

  test("variants that are not the cross product are refused on `variants` (BR6.4)", async () => {
    const stub = await catalogWorld();
    const req = productRequest("A");
    const before = stub.calls.length;
    const r = await createProduct(stub.sql, owner, {
      ...req,
      variants: req.variants.slice(0, 3),
    } as never);
    expect(r.ok ? null : r.error).toMatchObject({
      kind: "invalid_input",
      fields: [{ path: "variants" }],
    });
    expect(stub.calls.length).toBe(before);
  });

  test("a supplier of another business, or a non-UUID one, is not found (BR8.2)", async () => {
    const stub = await catalogWorld();
    const foreignSupplier = must(
      await createSupplier(stub.sql, ctxFor("owner", FOREIGN_BUSINESS), {
        name: "F",
        phone: "01711111111",
      }),
    );
    const r = await createProduct(
      stub.sql,
      owner,
      productRequest("A", { defaultSupplierId: foreignSupplier.id }) as never,
    );
    expect(r.ok ? "ok" : r.error.kind).toBe("not_found");
    const bad = await createProduct(
      stub.sql,
      owner,
      productRequest("A", { defaultSupplierId: "s" }) as never,
    );
    expect(bad.ok ? "ok" : bad.error.kind).toBe("not_found");
    expect(stub.state.products).toHaveLength(0);
  });

  test("Sales Staff and the Accountant cannot create products (BR1.3)", async () => {
    const stub = await catalogWorld();
    for (const role of ["sales_staff", "accountant"] as const) {
      const r = await createProduct(stub.sql, ctxFor(role), productRequest("A") as never);
      expect({ role, kind: r.ok ? "ok" : r.error.kind }).toEqual({ role, kind: "forbidden" });
    }
  });

  test("a failure after the product insert rolls back the product and its change-log row (R15)", async () => {
    const stub = await catalogWorld();
    const hooks = {
      afterProductInsert: async () => {
        throw new Error("injected failure after the product insert");
      },
    };
    await expect(
      createProduct(stub.sql, owner, productRequest("A") as never, { hooks }),
    ).rejects.toThrow(/injected/);
    expect([
      stub.state.products.length,
      stub.state.variants.length,
      stub.state.auditLog.length,
    ]).toEqual([0, 0, 0]);
  });
});

describe("cost leaves the catalog only for cost readers (S27, BR9.2, NFR1.14)", () => {
  test("productView: present for Owner, Manager, Accountant; ABSENT for Sales Staff", async () => {
    const stub = await catalogWorld();
    const p = must(await createProduct(stub.sql, owner, productRequest("A") as never));
    const seen = Object.fromEntries(
      ROLES.map((role) => [role, Object.hasOwn(productView(p, role), "purchaseCostPaise")]),
    );
    expect(seen).toEqual({ owner: true, manager: true, sales_staff: false, accountant: true });
    expect(productView(p, "accountant").purchaseCostPaise).toBe(80_000);
  });

  test("an unrecorded cost is null for a cost reader, never 0", async () => {
    const stub = await catalogWorld();
    const p = must(
      await createProduct(
        stub.sql,
        owner,
        productRequest("A", { purchaseCostPaise: null }) as never,
      ),
    );
    expect(productView(p, "owner").purchaseCostPaise).toBeNull();
  });

  test("list rows follow the same rule and carry no createdAt (D6)", async () => {
    const stub = await catalogWorld();
    must(await createProduct(stub.sql, owner, productRequest("A") as never));
    const page = must(await listProducts(stub.sql, owner, {}));
    const row = page.products[0]!;
    expect(Object.hasOwn(summaryView(row, "sales_staff"), "purchaseCostPaise")).toBe(false);
    expect(summaryView(row, "manager").purchaseCostPaise).toBe(80_000);
    expect(Object.hasOwn(summaryView(row, "owner"), "createdAt")).toBe(false);
  });
});

describe("updateProduct (W7, BR6.7)", () => {
  test("changes name, price and supplier; the change log carries price and supplier before/after", async () => {
    const stub = await catalogWorld();
    const p = must(await createProduct(stub.sql, owner, productRequest("A") as never));
    const s = must(await createSupplier(stub.sql, owner, { name: "S", phone: "01711111111" }));
    const after = must(
      await updateProduct(stub.sql, manager, p.id, {
        name: "নতুন নাম",
        sellingPricePaise: 150_000,
        defaultSupplierId: s.id,
      }),
    );
    expect(after).toMatchObject({ name: "নতুন নাম", sellingPricePaise: 150_000, sku: "A" });
    expect(after.defaultSupplier).toEqual({ id: s.id, name: "S", phone: "01711111111" });
    expect(after.variants).toHaveLength(4);
    expect(auditRows(stub).at(-1)?.payload).toEqual({
      changed: ["name", "sellingPricePaise", "defaultSupplierId"],
      sellingPricePaise: { before: 120_000, after: 150_000 },
      defaultSupplierId: { before: null, after: s.id },
    });
  });

  test("SKU, axes, variants or cost in an edit are unknown keys (BR6.7)", async () => {
    const stub = await catalogWorld();
    const p = must(await createProduct(stub.sql, owner, productRequest("A") as never));
    for (const body of [{ sku: "B" }, { axes: [] }, { purchaseCostPaise: 1 }, {}]) {
      const r = await updateProduct(stub.sql, owner, p.id, body as never);
      expect(r.ok ? "ok" : r.error.kind).toBe("invalid_input");
    }
  });

  test("an edit that changes nothing writes nothing (R20); a foreign product is not found", async () => {
    const stub = await catalogWorld();
    const p = must(await createProduct(stub.sql, owner, productRequest("A") as never));
    const audits = stub.state.auditLog.length;
    must(await updateProduct(stub.sql, owner, p.id, { name: "কুর্তি", category: "পোশাক" }));
    expect(stub.state.auditLog.length).toBe(audits);
    expect(callIndex(stub, /UPDATE products/)).toBe(-1);
    const foreign = await updateProduct(stub.sql, ctxFor("owner", FOREIGN_BUSINESS), p.id, {
      name: "x",
    });
    expect(foreign.ok ? "ok" : foreign.error.kind).toBe("not_found");
    const cleared = must(await updateProduct(stub.sql, owner, p.id, { category: null }));
    expect(cleared.category).toBeNull();
  });
});

describe("getProduct and listProducts (BR6.8, P19, D11)", () => {
  test("the list shows variant count, total stock and low count, and matches name or SKU", async () => {
    const stub = await catalogWorld();
    must(await createProduct(stub.sql, owner, productRequest("KURTI-1") as never));
    must(
      await createProduct(stub.sql, owner, productRequest("SHARI-9", { name: "শাড়ি" }) as never),
    );
    const all = must(await listProducts(stub.sql, owner, {}));
    expect(all.total).toBe(2);
    expect(all.products.find((p) => p.sku === "KURTI-1")).toMatchObject({
      variantCount: 4,
      totalStock: 8,
      lowCount: 1,
    });
    expect(
      must(await listProducts(stub.sql, owner, { q: "shari" })).products.map((p) => p.sku),
    ).toEqual(["SHARI-9"]);
    expect(must(await listProducts(stub.sql, owner, { q: "শাড়ি" })).total).toBe(1);
    const aggregates = stub.calls.filter((c) => /GROUP BY product_id/.test(c.text));
    expect(aggregates.length).toBeGreaterThan(0);
  });

  test("an empty list sends no aggregate query; foreign and non-UUID products are not found", async () => {
    const stub = await catalogWorld();
    expect(must(await listProducts(stub.sql, owner, {}))).toEqual({
      products: [],
      nextCursor: null,
      total: 0,
    });
    expect(stub.calls.some((c) => /GROUP BY product_id/.test(c.text))).toBe(false);
    const p = must(await createProduct(stub.sql, owner, productRequest("A") as never));
    expect((await getProduct(stub.sql, owner, p.id)).ok).toBe(true);
    for (const [ctx, id] of [
      [ctxFor("owner", FOREIGN_BUSINESS), p.id],
      [owner, "x"],
    ] as const) {
      const r = await getProduct(stub.sql, ctx, id);
      expect(r.ok ? "ok" : r.error.kind).toBe("not_found");
    }
  });
});

describe("C8 variant reads (BR14.1, BR14.2)", () => {
  test("getVariant: label and price from the product; NotFound outside the business", async () => {
    const stub = await catalogWorld();
    const p = must(await createProduct(stub.sql, owner, productRequest("A") as never));
    const v = p.variants[1]!;
    expect(must(await getVariant(stub.sql, owner, v.id))).toEqual({
      id: v.id,
      productId: p.id,
      label: "কুর্তি · M · নীল",
      sellingPricePaise: 120_000,
    });
    const foreign = await getVariant(stub.sql, { businessId: FOREIGN_BUSINESS }, v.id);
    expect(foreign.ok ? "ok" : foreign.error.kind).toBe("not_found");
    expect((await getVariant(stub.sql, owner, "x" as Uuid)).ok).toBe(false);
  });

  test("variantLabels resolves up to 50 ids in one query and throws past 50", async () => {
    const stub = await catalogWorld();
    const p = must(await createProduct(stub.sql, owner, productRequest("A") as never));
    const ids = p.variants.map((v) => v.id);
    const labels = await variantLabels(stub.sql, owner, ids);
    expect(labels.get(ids[0]!)).toBe("কুর্তি · M · লাল");
    expect(labels.size).toBe(4);
    await expect(
      variantLabels(
        stub.sql,
        owner,
        Array.from({ length: 51 }, () => ids[0]!),
      ),
    ).rejects.toThrow(/at most 50/);
  });
});
