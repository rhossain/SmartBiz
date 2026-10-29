/**
 * tests/helpers/catalog-fixtures.ts — U4 catalog test data (unit-test instructions "Test
 * data").
 *
 * - One business (the harness's) and a second one for tenancy; a context per role.
 * - Distinctive personal values (`ZZNAME…`, `ZZADDR…`, `ZZNOTE…`, `01999999999`) that the
 *   change-log payload search looks for (S30, NFR3.26); nothing else in a test contains them.
 * - A product request with 2 axes × 2 values, and a builder for any shape.
 * - `seedCatalog` writes one supplier, one customer with a note, and one product with two
 *   variants straight into the stub's rows under fixed ids, so the role walks can reach every
 *   `:id` catalog route with a real row (`catalogPath`).
 * No password or token literal here matches the secret scan.
 */
import type { Role } from "../../src/data/enums.js";
import type { Uuid } from "../../src/data/uuid.js";
import type { CatalogContext } from "../../src/catalog/types.js";
import { makeSqlStub } from "./sql-stub.js";
import { BUSINESS, seedBusiness, userIdFor } from "./server-harness.js";

export const FOREIGN_BUSINESS = "b0000000-0000-4000-8000-00000000000b" as Uuid;
export const AT = "2026-10-27T08:00:00.000Z";

export const ZZ = {
  name: "ZZNAME Rahima",
  phone: "01999999999",
  address: "ZZADDR Road 7",
  note: "ZZNOTE prefers cash",
  supplierName: "ZZNAME Supplier",
} as const;

export const ctxFor = (role: Role, businessId: Uuid = BUSINESS): CatalogContext => ({
  businessId,
  actorUserId: userIdFor(role),
  role,
});

/** Fixed ids of the seeded catalog rows (the walks' `:id` values). */
export const CATALOG_IDS = {
  supplier: "c1000000-0000-4000-8000-0000000000c1" as Uuid,
  customer: "c2000000-0000-4000-8000-0000000000c2" as Uuid,
  note: "c3000000-0000-4000-8000-0000000000c3" as Uuid,
  product: "c4000000-0000-4000-8000-0000000000c4" as Uuid,
  variant: "c5000000-0000-4000-8000-0000000000c5" as Uuid,
  variant2: "c6000000-0000-4000-8000-0000000000c6" as Uuid,
} as const;

/** The seeded product's two axes and its variants (one low: 1 < 3). */
export const SEEDED_AXES = [{ name: "সাইজ", values: ["M", "L"] }] as const;

export const productRequest = (sku: string, over: Record<string, unknown> = {}) => ({
  name: "কুর্তি",
  sku,
  category: "পোশাক",
  sellingPricePaise: 120_000,
  purchaseCostPaise: 80_000,
  defaultSupplierId: null,
  axes: [
    { name: "সাইজ", values: ["M", "L"] },
    { name: "রং", values: ["লাল", "নীল"] },
  ],
  variants: [
    { axisValues: ["M", "লাল"], stock: 5, minimumStock: 2 },
    { axisValues: ["M", "নীল"], stock: 1, minimumStock: 2 },
    { axisValues: ["L", "লাল"], stock: 0, minimumStock: 0 },
    { axisValues: ["L", "নীল"], stock: 2, minimumStock: 2 },
  ],
  ...over,
});

/** The largest valid product (D12, S33): 2 axes × 12 values of 30 Bangla characters. */
export const largestProductRequest = (sku: string) => {
  // 27 Bangla letters and a 3-digit number: 30 characters, distinct, no '-'.
  const values = (letter: string): string[] =>
    Array.from({ length: 12 }, (_, i) => `${letter.repeat(27)}${String(i).padStart(3, "0")}`);
  const a = values("ক");
  const b = values("খ");
  return {
    ...productRequest(sku),
    name: "ক".repeat(120),
    category: "ক".repeat(60),
    axes: [
      { name: "ক".repeat(30), values: a },
      { name: "খ".repeat(30), values: b },
    ],
    variants: a.flatMap((x) =>
      b.map((y) => ({ axisValues: [x, y], stock: 1_000_000, minimumStock: 1_000_000 })),
    ),
  };
};

type Stub = ReturnType<typeof makeSqlStub>;

/** A stub holding the harness business with one active user per role. */
export const catalogWorld = async (): Promise<Stub> => {
  const stub = makeSqlStub();
  await seedBusiness(stub);
  return stub;
};

/** The change-log rows the stub holds, payloads parsed. */
export const auditRows = (
  stub: Stub,
): Array<{
  action: string;
  subjectKind: string;
  subjectId: string;
  payload: Record<string, unknown>;
}> =>
  stub.state.auditLog.map((a) => ({
    action: String(a["action"]),
    subjectKind: String(a["subject_kind"]),
    subjectId: String(a["subject_id"]),
    payload: JSON.parse(String(a["payload"])) as Record<string, unknown>,
  }));

/** The index of the first recorded statement matching `re` (−1 when none). */
export const callIndex = (stub: Stub, re: RegExp): number =>
  stub.calls.findIndex((c) => re.test(c.text));

/** One supplier, one customer with one note, one product with two variants (fixed ids). */
export const seedCatalog = (stub: Stub, businessId: Uuid = BUSINESS): void => {
  const owner = stub.state.users.find((u) => u["business_id"] === businessId)?.["id"] ?? null;
  const at = new Date(AT);
  stub.state.suppliers.push({
    id: CATALOG_IDS.supplier,
    business_id: businessId,
    name: "রহিম ট্রেডার্স",
    phone: "01711000000",
    created_by: owner,
    created_at: at,
    updated_at: at,
  });
  stub.state.customers.push({
    id: CATALOG_IDS.customer,
    business_id: businessId,
    name: "রিনা আক্তার",
    phone: "01712345678",
    address: null,
    risk_level: 1,
    created_by: owner,
    created_at: at,
    updated_at: at,
  });
  stub.state.customerNotes.push({
    id: CATALOG_IDS.note,
    business_id: businessId,
    customer_id: CATALOG_IDS.customer,
    text: "ভালো ক্রেতা",
    revises_note_id: null,
    created_by: owner,
    created_at: at,
  });
  stub.state.products.push({
    id: CATALOG_IDS.product,
    business_id: businessId,
    name: "সুতির কুর্তি",
    sku: "KURTI-SEED",
    category: null,
    selling_price_paise: "120000",
    purchase_cost_paise: "80000",
    default_supplier_id: CATALOG_IDS.supplier,
    axes: SEEDED_AXES,
    created_by: owner,
    created_at: at,
    updated_at: at,
  });
  for (const [id, value, stock] of [
    [CATALOG_IDS.variant, "M", 1],
    [CATALOG_IDS.variant2, "L", 9],
  ] as const) {
    stub.state.variants.push({
      id,
      business_id: businessId,
      product_id: CATALOG_IDS.product,
      axis_values: [value],
      sku_suffix: value,
      stock,
      minimum_stock: 3,
      created_at: at,
      updated_at: at,
    });
  }
};

/** A catalog route's path with its `:id` filled by the seeded row it names. */
export const catalogPath = (path: string): string | null => {
  if (path.startsWith("/api/customers/:id")) return path.replace(":id", CATALOG_IDS.customer);
  if (path.startsWith("/api/products/:id")) return path.replace(":id", CATALOG_IDS.product);
  if (path.startsWith("/api/variants/:id")) return path.replace(":id", CATALOG_IDS.variant);
  if (path.startsWith("/api/suppliers/:id")) return path.replace(":id", CATALOG_IDS.supplier);
  return null;
};
