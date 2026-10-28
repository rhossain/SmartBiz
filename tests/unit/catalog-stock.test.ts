/**
 * tests/unit/catalog-stock.test.ts — stock, purchase cost, suppliers and the low-stock list on
 * the fail-closed stub (U4 W5, W8, W9, W10; BR7.1–BR7.3, BR8.1, BR8.4, BR9.1, BR10.1, BR10.2;
 * R20; SC7; NFR6.30, NFR7.27).
 *
 * Restated: stock and minimum are absolute; the change log records before → after of the
 * changed field only; a set that changes nothing writes nothing; `low` is stock < minimum;
 * only Owner and Manager set stock, while the Accountant may change cost (and only cost);
 * a supplier's change-log rows hold no name or phone; the supplier list counts default
 * products and stops at 200 with `truncated`; the low-stock list holds every low variant
 * with its supplier or null, by product name, and stops at 200 with `truncated`.
 */
import { describe, expect, test } from "bun:test";
import { listLowStock } from "../../src/catalog/low-stock.js";
import { createProduct } from "../../src/catalog/products.js";
import { setCost, setStock } from "../../src/catalog/stock.js";
import { createSupplier, listSuppliers, updateSupplier } from "../../src/catalog/suppliers.js";
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

const withProduct = async (over: Record<string, unknown> = {}) => {
  const stub = await catalogWorld();
  const product = must(
    await createProduct(stub.sql, owner, productRequest("KURTI-1", over) as never),
  );
  return { stub, product };
};

describe("setStock (W8, BR7.1, BR7.2)", () => {
  test("absolute values; before → after of the changed field only; low recomputed", async () => {
    const { stub, product } = await withProduct();
    const v = product.variants[0]!; // stock 5, minimum 2
    const after = must(await setStock(stub.sql, manager, v.id, { stock: 1 }));
    expect(after).toMatchObject({ stock: 1, minimumStock: 2, low: true, fullSku: v.fullSku });
    expect(auditRows(stub).at(-1)).toEqual({
      action: "variant.stock.set",
      subjectKind: "variant",
      subjectId: v.id,
      payload: { productId: product.id, stock: { before: 5, after: 1 } },
    });
    const both = must(await setStock(stub.sql, manager, v.id, { stock: 4, minimumStock: 4 }));
    expect(both.low).toBe(false);
    expect(auditRows(stub).at(-1)?.payload).toEqual({
      productId: product.id,
      stock: { before: 1, after: 4 },
      minimumStock: { before: 2, after: 4 },
    });
  });

  test("a set that changes nothing writes nothing (R20)", async () => {
    const { stub, product } = await withProduct();
    const v = product.variants[0]!;
    const audits = stub.state.auditLog.length;
    must(await setStock(stub.sql, owner, v.id, { stock: v.stock, minimumStock: v.minimumStock }));
    expect(stub.state.auditLog.length).toBe(audits);
    expect(callIndex(stub, /UPDATE variants/)).toBe(-1);
  });

  test("negative, fractional, too large and empty sets are refused", async () => {
    const { stub, product } = await withProduct();
    const v = product.variants[0]!;
    for (const body of [{ stock: -1 }, { stock: 1.5 }, { minimumStock: 1_000_001 }, {}]) {
      const r = await setStock(stub.sql, owner, v.id, body as never);
      expect(r.ok ? "ok" : r.error.kind).toBe("invalid_input");
    }
  });

  test("Sales Staff and the Accountant cannot set stock; foreign and non-UUID variants are 404", async () => {
    const { stub, product } = await withProduct();
    const v = product.variants[0]!;
    for (const role of ["sales_staff", "accountant"] as const) {
      const r = await setStock(stub.sql, ctxFor(role), v.id, { stock: 1 });
      expect({ role, kind: r.ok ? "ok" : r.error.kind }).toEqual({ role, kind: "forbidden" });
    }
    const foreign = await setStock(stub.sql, ctxFor("owner", FOREIGN_BUSINESS), v.id, { stock: 1 });
    expect(foreign.ok ? "ok" : foreign.error.kind).toBe("not_found");
    const bad = await setStock(stub.sql, owner, "nope", { stock: 1 });
    expect(bad.ok ? "ok" : bad.error.kind).toBe("not_found");
  });
});

describe("setCost (W9, BR9.1, BR1.4)", () => {
  test("the Accountant changes the cost only; the change log holds before and after", async () => {
    const { stub, product } = await withProduct({ purchaseCostPaise: null });
    const after = must(
      await setCost(stub.sql, ctxFor("accountant"), product.id, { purchaseCostPaise: 70_000 }),
    );
    expect(after.purchaseCostPaise).toBe(70_000);
    expect(after.sellingPricePaise).toBe(product.sellingPricePaise);
    expect(auditRows(stub).at(-1)).toEqual({
      action: "product.cost.set",
      subjectKind: "product",
      subjectId: product.id,
      payload: { before: null, after: 70_000 },
    });
    const updates = stub.calls.filter((c) => /UPDATE products/.test(c.text));
    expect(updates.map((c) => c.text.replace(/\s+/g, " ").trim())).toEqual([
      "UPDATE products SET purchase_cost_paise = ? WHERE id = ? AND business_id = ?",
    ]);
  });

  test("the same cost writes nothing; Sales Staff is refused; the body is exactly the cost", async () => {
    const { stub, product } = await withProduct();
    const audits = stub.state.auditLog.length;
    must(await setCost(stub.sql, owner, product.id, { purchaseCostPaise: 80_000 }));
    expect(stub.state.auditLog.length).toBe(audits);
    const sales = await setCost(stub.sql, ctxFor("sales_staff"), product.id, {
      purchaseCostPaise: 1,
    });
    expect(sales.ok ? "ok" : sales.error.kind).toBe("forbidden");
    for (const body of [
      { purchaseCostPaise: -1 },
      { purchaseCostPaise: 1, sellingPricePaise: 1 },
      {},
    ]) {
      const r = await setCost(stub.sql, owner, product.id, body as never);
      expect(r.ok ? "ok" : r.error.kind).toBe("invalid_input");
    }
    const foreign = await setCost(stub.sql, ctxFor("owner", FOREIGN_BUSINESS), product.id, {
      purchaseCostPaise: 1,
    });
    expect(foreign.ok ? "ok" : foreign.error.kind).toBe("not_found");
  });
});

describe("suppliers (W5, BR8.1, BR8.4)", () => {
  test("create and edit; the change log keeps no name or phone; no-op edits write nothing", async () => {
    const stub = await catalogWorld();
    const s = must(
      await createSupplier(stub.sql, manager, { name: "রহিম", phone: "০১৭১১-০০০০০০" }),
    );
    expect(s).toMatchObject({ name: "রহিম", phone: "01711000000", productCount: 0 });
    const edited = must(await updateSupplier(stub.sql, manager, s.id, { phone: "01811000000" }));
    expect(edited.phone).toBe("01811000000");
    expect(auditRows(stub).map((a) => a.payload)).toEqual([{}, { changed: ["phone"] }]);
    const audits = stub.state.auditLog.length;
    must(await updateSupplier(stub.sql, manager, s.id, { name: "রহিম" }));
    expect(stub.state.auditLog.length).toBe(audits);
  });

  test("a bad phone, Sales Staff and a foreign supplier are refused", async () => {
    const stub = await catalogWorld();
    const bad = await createSupplier(stub.sql, owner, { name: "X", phone: "123" });
    expect(bad.ok ? null : bad.error).toMatchObject({
      kind: "invalid_input",
      fields: [{ path: "phone" }],
    });
    const sales = await createSupplier(stub.sql, ctxFor("sales_staff"), {
      name: "X",
      phone: "01711111111",
    });
    expect(sales.ok ? "ok" : sales.error.kind).toBe("forbidden");
    const s = must(await createSupplier(stub.sql, owner, { name: "X", phone: "01711111111" }));
    const foreign = await updateSupplier(stub.sql, ctxFor("owner", FOREIGN_BUSINESS), s.id, {
      name: "Y",
    });
    expect(foreign.ok ? "ok" : foreign.error.kind).toBe("not_found");
    const nonUuid = await updateSupplier(stub.sql, owner, "x", { name: "Y" });
    expect(nonUuid.ok ? "ok" : nonUuid.error.kind).toBe("not_found");
  });

  test("the list is by name with each supplier's default-product count; 200 + truncated", async () => {
    const stub = await catalogWorld();
    const b = must(await createSupplier(stub.sql, owner, { name: "বাবুল", phone: "01711111111" }));
    must(await createSupplier(stub.sql, owner, { name: "আলম", phone: "01711111112" }));
    must(
      await createProduct(
        stub.sql,
        owner,
        productRequest("P1", { defaultSupplierId: b.id }) as never,
      ),
    );
    const list = must(await listSuppliers(stub.sql, owner));
    expect(list.suppliers.map((s) => [s.name, s.productCount])).toEqual([
      ["আলম", 0],
      ["বাবুল", 1],
    ]);
    expect(list.truncated).toBe(false);
    for (let i = 0; i < 199; i++) {
      stub.state.suppliers.push({
        ...stub.state.suppliers[0],
        id: `${String(i).padStart(8, "0")}-0000-4000-8000-000000000000`,
      });
    }
    const full = must(await listSuppliers(stub.sql, owner));
    expect(full.suppliers).toHaveLength(200);
    expect(full.truncated).toBe(true);
  });
});

describe("listLowStock (W10, BR7.3, BR7.4)", () => {
  test("every low variant with its product, values, full SKU and supplier (or null)", async () => {
    const stub = await catalogWorld();
    const s = must(await createSupplier(stub.sql, owner, { name: "রহিম", phone: "01711000000" }));
    must(
      await createProduct(
        stub.sql,
        owner,
        productRequest("B-1", { name: "বেল্ট", defaultSupplierId: s.id }) as never,
      ),
    );
    must(await createProduct(stub.sql, owner, productRequest("A-1", { name: "আংটি" }) as never));
    const low = must(await listLowStock(stub.sql, ctxFor("sales_staff")));
    expect(low.truncated).toBe(false);
    expect(
      low.variants.map((v) => [
        v.productName,
        v.fullSku,
        v.stock,
        v.minimumStock,
        v.supplier?.name ?? null,
      ]),
    ).toEqual([
      ["আংটি", "A-1-M-নীল", 1, 2, null],
      ["বেল্ট", "B-1-M-নীল", 1, 2, "রহিম"],
    ]);
    expect(low.variants.every((v) => !Object.hasOwn(v, "purchaseCostPaise"))).toBe(true);
  });

  test("at the minimum is not low; nothing low is an empty list; another business sees nothing", async () => {
    const stub = await catalogWorld();
    const p = must(await createProduct(stub.sql, owner, productRequest("A-1") as never));
    const lowVariant = p.variants.find((v) => v.low)!;
    must(await setStock(stub.sql, owner, lowVariant.id, { stock: lowVariant.minimumStock }));
    expect(must(await listLowStock(stub.sql, owner))).toEqual({ variants: [], truncated: false });
    must(await setStock(stub.sql, owner, lowVariant.id, { stock: 0 }));
    expect(must(await listLowStock(stub.sql, ctxFor("owner", FOREIGN_BUSINESS))).variants).toEqual(
      [],
    );
  });

  test("more than 200 low variants: 200 rows and truncated", async () => {
    const stub = await catalogWorld();
    const p = must(await createProduct(stub.sql, owner, productRequest("A-1") as never));
    const template = stub.state.variants[0]!;
    for (let i = 0; i < 201; i++) {
      stub.state.variants.push({
        ...template,
        id: `${String(i).padStart(8, "0")}-0000-4000-8000-000000000001`,
        product_id: p.id,
        axis_values: [`v${i}`],
        stock: 0,
        minimum_stock: 1,
      });
    }
    const low = must(await listLowStock(stub.sql, owner));
    expect(low.variants).toHaveLength(200);
    expect(low.truncated).toBe(true);
  });
});
