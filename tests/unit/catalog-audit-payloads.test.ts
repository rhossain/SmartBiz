/**
 * tests/unit/catalog-audit-payloads.test.ts — no personal data in any catalog change-log row
 * (U4 BR10.2; S30; NFR3.26, NFR8.20; O8).
 *
 * Every one of the nine catalog actions is written through the domain functions with
 * distinctive values — a customer name, phone, address and note text, and a supplier name
 * and phone — and every stored payload is searched for each of them. The change log is
 * insert-only and kept 5 years, so a value found here could never be erased (team.md
 * Deployment). This is the test the named mutant "customer.create payload gains the name"
 * maps to. O8: each action has a Bangla and English label on the audit trail.
 */
import { describe, expect, test } from "bun:test";
import { CATALOG_ACTION_LABELS, CATALOG_AUDIT_ACTIONS } from "../../src/catalog/catalog-audit.js";
import { createCustomer, updateCustomer } from "../../src/catalog/customers.js";
import { memoryPhotoStore, setProductPhoto } from "../../src/catalog/product-photo.js";
import { addNote } from "../../src/catalog/notes.js";
import { createProduct, updateProduct } from "../../src/catalog/products.js";
import { setCost, setStock } from "../../src/catalog/stock.js";
import { createSupplier, updateSupplier } from "../../src/catalog/suppliers.js";
import { hasKey, lookup } from "../../src/i18n/L.js";
import {
  auditRows,
  catalogWorld,
  ctxFor,
  productRequest,
  ZZ,
} from "../helpers/catalog-fixtures.js";

const owner = ctxFor("owner");

const must = <T>(r: { ok: true; value: T } | { ok: false; error: unknown }): T => {
  if (!r.ok) throw new Error(`expected ok, got ${JSON.stringify(r.error)}`);
  return r.value;
};

describe("catalog change-log payloads hold no personal data (BR10.2, S30)", () => {
  test("all ten actions, written with distinctive values, keep none of them", async () => {
    const stub = await catalogWorld();
    const c = must(
      await createCustomer(stub.sql, owner, {
        name: ZZ.name,
        phone: ZZ.phone,
        address: ZZ.address,
        riskLevel: 1,
        note: `${ZZ.note} first`,
      }),
    ).customer;
    must(
      await updateCustomer(stub.sql, owner, c.id, {
        name: `${ZZ.name} B`,
        phone: "01999999998",
        address: `${ZZ.address} B`,
        riskLevel: 2,
      }),
    );
    const note = must(await addNote(stub.sql, owner, c.id, { text: ZZ.note }));
    must(
      await addNote(stub.sql, owner, c.id, { text: `${ZZ.note} revised`, revisesNoteId: note.id }),
    );
    const s = must(
      await createSupplier(stub.sql, owner, { name: ZZ.supplierName, phone: "01999999997" }),
    );
    must(
      await updateSupplier(stub.sql, owner, s.id, {
        name: `${ZZ.supplierName} B`,
        phone: "01999999996",
      }),
    );
    const p = must(
      await createProduct(
        stub.sql,
        owner,
        productRequest("ZZ-1", { defaultSupplierId: s.id }) as never,
      ),
    );
    must(
      await updateProduct(stub.sql, owner, p.id, { sellingPricePaise: 1, defaultSupplierId: null }),
    );
    must(await setCost(stub.sql, owner, p.id, { purchaseCostPaise: 2 }));
    must(await setStock(stub.sql, owner, p.variants[0]!.id, { stock: 9 }));
    // Product photos: the change-log row names the type only, never the bytes.
    must(
      await setProductPhoto(
        stub.sql,
        owner,
        p.id,
        { photo: { contentType: "image/png", data: "iVBORw0KGgoAAAAA" } },
        memoryPhotoStore(),
      ),
    );

    const rows = auditRows(stub);
    expect([...new Set(rows.map((r) => r.action))].sort()).toEqual(
      [...CATALOG_AUDIT_ACTIONS].sort(),
    );
    const text = JSON.stringify(rows.map((r) => r.payload));
    for (const secret of [
      "ZZNAME",
      "ZZADDR",
      "ZZNOTE",
      ZZ.phone,
      "01999999998",
      "01999999997",
      "01999999996",
    ]) {
      expect({ secret, found: text.includes(secret) }).toEqual({ secret, found: false });
    }
  });

  test("the customer.create payload is exactly {riskLevel, hasAddress}", async () => {
    const stub = await catalogWorld();
    must(
      await createCustomer(stub.sql, owner, {
        name: ZZ.name,
        phone: ZZ.phone,
        address: ZZ.address,
      }),
    );
    expect(auditRows(stub)[0]?.payload).toEqual({ riskLevel: 0, hasAddress: true });
  });

  test("a supplier create has an empty payload and an edit only the changed field names", async () => {
    const stub = await catalogWorld();
    const s = must(
      await createSupplier(stub.sql, owner, { name: ZZ.supplierName, phone: ZZ.phone }),
    );
    must(await updateSupplier(stub.sql, owner, s.id, { name: "Other" }));
    expect(auditRows(stub).map((r) => r.payload)).toEqual([{}, { changed: ["name"] }]);
  });
});

describe("audit-trail labels for the catalog actions (O8, NFR8.20)", () => {
  test("every action has a label key in both languages", () => {
    for (const action of CATALOG_AUDIT_ACTIONS) {
      const key = CATALOG_ACTION_LABELS[action];
      expect({ action, key, exists: hasKey(key) }).toEqual({ action, key, exists: true });
      expect(lookup(key, "bn").length).toBeGreaterThan(0);
      expect(lookup(key, "en").length).toBeGreaterThan(0);
    }
    expect(lookup(CATALOG_ACTION_LABELS["variant.stock.set"], "bn")).toBe("মজুদ বদল");
    expect(lookup(CATALOG_ACTION_LABELS["product.cost.set"], "bn")).toBe("ক্রয়মূল্য বদল");
  });
});
