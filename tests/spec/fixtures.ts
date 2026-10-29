/**
 * tests/spec/fixtures.ts — one recorded success body per API route, and the request inputs
 * the walks send (D-04; S11, S14; F-07, F-08; contract ownership rule 2).
 *
 * `API_FIXTURES` is keyed `METHOD /path` exactly like the role table's API rows. Each entry
 * carries:
 *   - `status` and `body`: the success answer the client walk's stubbed `fetch` replays;
 *   - `schema`: the route's SHARED response schema (the one the server's handler and the
 *     browser client both use; `null` for a 204). Every test that uses a body parses it with
 *     this schema first, so a fixture that drifts from the contract fails the test instead
 *     of silently rendering an error view;
 *   - `request`: a body that satisfies the domain, for writes, so an allowed role's probe in
 *     the server walk never hits a domain refusal that could be mistaken for the gate (F-07);
 *   - `badRequest`: an input the route refuses with 400 (where the route takes input), for
 *     the no-secret walk's error bodies (F-08).
 * The no-secret walk fails on any registered route that has no entry here (F-08).
 * Bodies are restated by hand from C2–C4, not captured from the code under test.
 */
import type { ZodType } from "zod";
import { AuditPageResponseSchema } from "../../src/audit/schemas.js";
import {
  AcceptInviteResponseSchema,
  HealthResponseSchema,
  InviteResponseSchema,
  ResetLinkResponseSchema,
  SessionResponseSchema,
  SetupResponseSchema,
  StaffListResponseSchema,
} from "../../src/auth/schemas.js";
import {
  CustomerDetailResponseSchema,
  CustomerListResponseSchema,
  CustomerWriteResponseSchema,
  LowStockResponseSchema,
  MatchIndexResponseSchema,
  NoteWriteResponseSchema,
  ProductListResponseSchema,
  ProductSchema,
  ProductWriteResponseSchema,
  SupplierListResponseSchema,
  SupplierWriteResponseSchema,
  VariantWriteResponseSchema,
} from "../../src/catalog/schemas.js";
import { OrderResponseSchema, OrdersPageResponseSchema } from "../../src/orders/schemas.js";
import { CATALOG_IDS } from "../helpers/catalog-fixtures.js";
import { FIXTURE_ORDER_NO, type Role } from "./role-table.js";

export const FIXTURE_BUSINESS_ID = "a0000000-0000-4000-8000-00000000000a";
export const FIXTURE_ORDER_ID = "0f0f0f0f-0f0f-4f0f-8f0f-0f0f0f0f0f0f";
const OWNER_ID = "a1000000-0000-4000-8000-0000000000a1";
const LINE_ID = "0e0e0e0e-0e0e-4e0e-8e0e-0e0e0e0e0e0e";
const LINK_ID = "0d0d0d0d-0d0d-4d0d-8d0d-0d0d0d0d0d0d";
const AT = "2026-10-27T08:30:00.000Z";

export interface ApiFixture {
  readonly status: number;
  readonly body: unknown;
  readonly schema: ZodType<unknown> | null;
  readonly request?: unknown;
  readonly badRequest?: unknown;
  /** A query string the route refuses with 400 (GET routes that take a query). */
  readonly badQuery?: string;
}

const userIdFor = (role: Role): string =>
  `a${["owner", "manager", "sales_staff", "accountant"].indexOf(role) + 1}000000-0000-4000-8000-0000000000a1`;
const userId = userIdFor;

/** The C2 Session body for one role (the session the server resolved; no token, no hash). */
export const sessionBody = (role: Role) => ({
  user: { id: userId(role), email: `${role}@acme.test`, role, locale: "bn" as const },
  businessId: FIXTURE_BUSINESS_ID,
  capabilities: [],
});

export const ORDER_REQUEST = {
  source: "manual",
  customerId: null,
  contact: { name: "রিনা", phone: "01711111111", address: null },
  repeatOfOrderId: null,
  items: [
    {
      variantId: null,
      description: "কুর্তি",
      quantity: 1,
      unitPricePaise: 1000,
      lineDiscountPaise: 0,
    },
  ],
  orderDiscountPaise: 0,
  deliveryChargePaise: 0,
} as const;

export const orderBody = (consignment: unknown = null) => ({
  id: FIXTURE_ORDER_ID,
  businessId: FIXTURE_BUSINESS_ID,
  orderNo: FIXTURE_ORDER_NO,
  customerId: null,
  contact: { name: "রিনা", phone: "01711111111", address: null },
  status: "new",
  source: "manual",
  repeatOfOrderId: null,
  itemsRevision: 1,
  items: [
    {
      id: LINE_ID,
      orderId: FIXTURE_ORDER_ID,
      businessId: FIXTURE_BUSINESS_ID,
      lineNo: 1,
      variantId: null,
      description: "কুর্তি",
      quantity: 1,
      unitPricePaise: 1000,
      lineDiscountPaise: 0,
    },
  ],
  orderDiscountPaise: 0,
  deliveryChargePaise: 0,
  totalPaise: 1000,
  createdBy: OWNER_ID,
  createdAt: AT,
  updatedAt: AT,
  consignment,
});

const CONSIGNMENT = {
  id: LINK_ID,
  businessId: FIXTURE_BUSINESS_ID,
  orderId: FIXTURE_ORDER_ID,
  courier: "pathao",
  consignmentRef: "PT-1234",
  linkedBy: OWNER_ID,
  linkedAt: AT,
};

export const AUDIT_PAGE_BODY = {
  entries: [
    {
      id: "0c0c0c0c-0c0c-4c0c-8c0c-0c0c0c0c0c01",
      occurredAt: "2026-10-27T08:31:00.000Z",
      action: "order.create",
      subjectKind: "order",
      subjectId: FIXTURE_ORDER_ID,
      actorEmail: "owner@acme.test",
      correlationId: "3f2a9c1d5e7b8a60",
      reversesId: null,
    },
    {
      id: "0c0c0c0c-0c0c-4c0c-8c0c-0c0c0c0c0c02",
      occurredAt: "2026-10-27T08:30:00.000Z",
      action: "auth.sign_in.failure",
      subjectKind: "user",
      subjectId: null,
      actorEmail: null,
      correlationId: "9b1e4d2c7a3f6e05",
      reversesId: null,
    },
  ],
  nextCursor: null,
};

/*
 * U3 (C6 with B2, B4; BR10.1). Restated from C6: the staff list as the Owner sees it, an
 * invitation and a reset link with their one-time `link` (a placeholder token, not a real
 * one), the public user accept answers with, and the bodiless 202 / 204 of recover and reset.
 */
export const STAFF_TARGET_ID = userIdFor("sales_staff");
export const INVITE_REQUEST = { email: "new.staff@acme.test", role: "sales_staff" } as const;
/** A well-formed token no invitation or reset was ever issued for: the walks expect 410. */
export const UNISSUED_TOKEN = "U".repeat(43);
export const TOKEN_REQUEST = { token: UNISSUED_TOKEN, password: "correct-horse-2" } as const;

export const STAFF_LIST_BODY = {
  members: (["owner", "manager", "sales_staff", "accountant"] as const).map((role) => ({
    id: userIdFor(role),
    email: `${role}@acme.test`,
    role,
    active: true,
    canReset: role !== "owner",
  })),
  invitations: [
    {
      id: "0a0a0a0a-0a0a-4a0a-8a0a-0a0a0a0a0a0a",
      email: "new.staff@acme.test",
      role: "sales_staff",
      expiresAt: "2026-11-03T08:30:00.000Z",
    },
  ],
  invitableRoles: ["manager", "sales_staff", "accountant"],
  truncated: false,
};

export const INVITE_BODY = {
  invitation: STAFF_LIST_BODY.invitations[0],
  link: "http://127.0.0.1:3000/#/accept-invite?t=fixture-placeholder",
};

export const RESET_LINK_BODY = {
  link: "http://127.0.0.1:3000/#/reset?t=fixture-placeholder",
  expiresAt: "2026-10-27T09:00:00.000Z",
};

/*
 * U4 (C7 with D1–D13; functional-spec §3a). Restated by hand: the seeded catalog rows of
 * tests/helpers/catalog-fixtures.ts as the Owner sees them (cost present), and one request
 * per write that the domain accepts. The recorded product create uses its own SKU; the server
 * walk gives each inside probe a fresh one (a SKU is unique per business).
 */
const SUPPLIER = {
  id: CATALOG_IDS.supplier,
  name: "রহিম ট্রেডার্স",
  phone: "01711000000",
  productCount: 1,
  createdAt: AT,
  updatedAt: AT,
};
const CUSTOMER = {
  id: CATALOG_IDS.customer,
  name: "রিনা আক্তার",
  phone: "01712345678",
  address: null,
  riskLevel: 1,
  createdAt: AT,
  updatedAt: AT,
};
const { updatedAt: _customerUpdated, ...CUSTOMER_ROW } = CUSTOMER;
const NOTE = {
  id: CATALOG_IDS.note,
  text: "ভালো ক্রেতা",
  revisesNoteId: null,
  createdAt: AT,
  authorName: "owner@acme.test",
};
const VARIANTS = [
  {
    id: CATALOG_IDS.variant,
    axisValues: ["M"],
    skuSuffix: "M",
    fullSku: "KURTI-SEED-M",
    stock: 1,
    minimumStock: 3,
    low: true,
  },
  {
    id: CATALOG_IDS.variant2,
    axisValues: ["L"],
    skuSuffix: "L",
    fullSku: "KURTI-SEED-L",
    stock: 9,
    minimumStock: 3,
    low: false,
  },
];
export const PRODUCT_BODY = {
  id: CATALOG_IDS.product,
  name: "সুতির কুর্তি",
  sku: "KURTI-SEED",
  category: null,
  sellingPricePaise: 120_000,
  purchaseCostPaise: 80_000,
  axes: [{ name: "সাইজ", values: ["M", "L"] }],
  variants: VARIANTS,
  defaultSupplier: { id: SUPPLIER.id, name: SUPPLIER.name, phone: SUPPLIER.phone },
  createdAt: AT,
  updatedAt: AT,
};
export const PRODUCT_REQUEST = {
  name: "লেডিস স্যান্ডেল",
  sku: "WALK-SANDAL",
  sellingPricePaise: 90_000,
  purchaseCostPaise: 60_000,
  axes: [{ name: "সাইজ", values: ["36", "37"] }],
  variants: [
    { axisValues: ["36"], stock: 4, minimumStock: 2 },
    { axisValues: ["37"], stock: 1, minimumStock: 2 },
  ],
};
const CUSTOMER_REQUEST = { name: "নতুন ক্রেতা", phone: "০১৮১২৩৪৫৬৭৮", riskLevel: 0 };

export const SIGN_UP_REQUEST = {
  businessName: "Acme",
  email: "owner@acme.test",
  password: "correct-horse-1",
};

export const API_FIXTURES: Readonly<Record<string, ApiFixture>> = {
  "GET /api/health": {
    status: 200,
    body: { status: "up", db: "up" },
    schema: HealthResponseSchema,
  },
  "GET /api/setup": { status: 200, body: { businessExists: true }, schema: SetupResponseSchema },
  "POST /api/auth/sign-up": {
    status: 201,
    body: sessionBody("owner"),
    schema: SessionResponseSchema,
    request: SIGN_UP_REQUEST,
    badRequest: { businessName: "Acme", email: "owner@acme.test" },
  },
  "POST /api/auth/sign-in": {
    status: 200,
    body: sessionBody("owner"),
    schema: SessionResponseSchema,
    request: { email: "owner@acme.test", password: "correct-horse-1" },
    badRequest: { email: "owner@acme.test" },
  },
  "POST /api/auth/sign-out": { status: 204, body: null, schema: null, request: {} },
  "GET /api/session": { status: 200, body: sessionBody("owner"), schema: SessionResponseSchema },
  "GET /api/orders": {
    status: 200,
    body: {
      orders: [
        {
          id: FIXTURE_ORDER_ID,
          orderNo: FIXTURE_ORDER_NO,
          status: "new",
          source: "manual",
          totalPaise: 1000,
          createdAt: AT,
          customerName: "রিনা",
          itemLabels: ["কুর্তি"],
        },
      ],
      nextCursor: null,
    },
    schema: OrdersPageResponseSchema,
    badQuery: "limit=0",
  },
  "POST /api/orders": {
    status: 201,
    body: orderBody(),
    schema: OrderResponseSchema,
    request: ORDER_REQUEST,
    badRequest: { ...ORDER_REQUEST, items: [] },
  },
  "GET /api/orders/:id": { status: 200, body: orderBody(), schema: OrderResponseSchema },
  "PATCH /api/orders/:id": {
    status: 200,
    body: orderBody(),
    schema: OrderResponseSchema,
    request: { deliveryChargePaise: 500 },
    badRequest: {},
  },
  "POST /api/orders/:id/status": {
    status: 200,
    body: { ...orderBody(), status: "confirmed" },
    schema: OrderResponseSchema,
    request: { to: "confirmed" },
    badRequest: { to: "lost" },
  },
  "POST /api/orders/:id/consignment": {
    status: 201,
    body: orderBody(CONSIGNMENT),
    schema: OrderResponseSchema,
    request: { consignmentRef: "PT-1234" },
    badRequest: { consignmentRef: "" },
  },
  "GET /api/audit": {
    status: 200,
    body: AUDIT_PAGE_BODY,
    schema: AuditPageResponseSchema,
    badQuery: "limit=0",
  },
  "GET /api/staff": { status: 200, body: STAFF_LIST_BODY, schema: StaffListResponseSchema },
  "POST /api/staff/invitations": {
    status: 201,
    body: INVITE_BODY,
    schema: InviteResponseSchema,
    request: INVITE_REQUEST,
    badRequest: { email: INVITE_REQUEST.email },
  },
  "POST /api/staff/:userId/reset-links": {
    status: 201,
    body: RESET_LINK_BODY,
    schema: ResetLinkResponseSchema,
    request: {},
    badRequest: { userId: STAFF_TARGET_ID },
  },
  "POST /api/invitations/accept": {
    status: 201,
    body: sessionBody("sales_staff").user,
    schema: AcceptInviteResponseSchema,
    request: TOKEN_REQUEST,
    badRequest: { token: UNISSUED_TOKEN },
  },
  "POST /api/auth/recover": {
    status: 202,
    body: null,
    schema: null,
    request: { email: "owner@acme.test" },
    badRequest: {},
  },
  "POST /api/auth/reset": {
    status: 204,
    body: null,
    schema: null,
    request: TOKEN_REQUEST,
    badRequest: { token: UNISSUED_TOKEN },
  },
  // U4 catalog (C7).
  "GET /api/customers": {
    status: 200,
    body: { customers: [CUSTOMER_ROW], nextCursor: null, total: 1 },
    schema: CustomerListResponseSchema,
    badQuery: "limit=0",
  },
  "POST /api/customers": {
    status: 201,
    body: { customer: CUSTOMER, duplicatePhoneOf: null },
    schema: CustomerWriteResponseSchema,
    request: CUSTOMER_REQUEST,
    badRequest: { name: "নতুন ক্রেতা" },
  },
  "GET /api/customers/:id": {
    status: 200,
    body: { ...CUSTOMER, notes: [NOTE], notesTruncated: false },
    schema: CustomerDetailResponseSchema,
  },
  "PATCH /api/customers/:id": {
    status: 200,
    body: { customer: CUSTOMER, duplicatePhoneOf: null },
    schema: CustomerWriteResponseSchema,
    request: { riskLevel: 2 },
    badRequest: {},
  },
  "POST /api/customers/:id/notes": {
    status: 201,
    body: { note: NOTE },
    schema: NoteWriteResponseSchema,
    request: { text: "আবার অর্ডার করবেন" },
    badRequest: { text: "" },
  },
  "GET /api/products": {
    status: 200,
    body: {
      products: [
        {
          id: PRODUCT_BODY.id,
          name: PRODUCT_BODY.name,
          sku: PRODUCT_BODY.sku,
          category: null,
          sellingPricePaise: 120_000,
          purchaseCostPaise: 80_000,
          variantCount: 2,
          totalStock: 10,
          lowCount: 1,
          defaultSupplier: { id: SUPPLIER.id, name: SUPPLIER.name },
        },
      ],
      nextCursor: null,
      total: 1,
    },
    schema: ProductListResponseSchema,
    badQuery: "limit=0",
  },
  "POST /api/products": {
    status: 201,
    body: { product: PRODUCT_BODY },
    schema: ProductWriteResponseSchema,
    request: PRODUCT_REQUEST,
    badRequest: { ...PRODUCT_REQUEST, variants: [] },
  },
  "GET /api/products/:id": { status: 200, body: PRODUCT_BODY, schema: ProductSchema },
  "PATCH /api/products/:id": {
    status: 200,
    body: { product: PRODUCT_BODY },
    schema: ProductWriteResponseSchema,
    request: { sellingPricePaise: 125_000 },
    badRequest: { sku: "OTHER" },
  },
  "PATCH /api/products/:id/cost": {
    status: 200,
    body: { product: PRODUCT_BODY },
    schema: ProductWriteResponseSchema,
    request: { purchaseCostPaise: 75_000 },
    badRequest: { purchaseCostPaise: -1 },
  },
  "PATCH /api/variants/:id/stock": {
    status: 200,
    body: { variant: VARIANTS[0] },
    schema: VariantWriteResponseSchema,
    request: { stock: 4 },
    badRequest: { stock: -1 },
  },
  "GET /api/low-stock": {
    status: 200,
    body: {
      variants: [
        {
          variantId: CATALOG_IDS.variant,
          productId: PRODUCT_BODY.id,
          productName: PRODUCT_BODY.name,
          axisValues: ["M"],
          fullSku: "KURTI-SEED-M",
          stock: 1,
          minimumStock: 3,
          supplier: { id: SUPPLIER.id, name: SUPPLIER.name, phone: SUPPLIER.phone },
        },
      ],
      truncated: false,
    },
    schema: LowStockResponseSchema,
  },
  // U5 (C7 amendment E3): ids, names, SKU and axes only — no cost, no stock.
  "GET /api/catalog/match-index": {
    status: 200,
    body: {
      products: [
        {
          productId: PRODUCT_BODY.id,
          name: PRODUCT_BODY.name,
          sku: "KURTI-SEED",
          axisNames: ["সাইজ"],
          variants: [
            { variantId: CATALOG_IDS.variant, axisValues: ["M"] },
            { variantId: CATALOG_IDS.variant2, axisValues: ["L"] },
          ],
        },
      ],
      truncated: false,
    },
    schema: MatchIndexResponseSchema,
    badQuery: "q=x",
  },
  "GET /api/suppliers": {
    status: 200,
    body: { suppliers: [SUPPLIER], truncated: false },
    schema: SupplierListResponseSchema,
  },
  "POST /api/suppliers": {
    status: 201,
    body: { supplier: { ...SUPPLIER, productCount: 0 } },
    schema: SupplierWriteResponseSchema,
    request: { name: "করিম হোলসেল", phone: "01811000000" },
    badRequest: { name: "করিম হোলসেল" },
  },
  "PATCH /api/suppliers/:id": {
    status: 200,
    body: { supplier: SUPPLIER },
    schema: SupplierWriteResponseSchema,
    request: { name: "রহিম এন্টারপ্রাইজ" },
    badRequest: {},
  },
};

/** The fixture for a route key, parsed with its shared schema; throws when it does not parse. */
export const parsedFixture = (key: string): { readonly status: number; readonly body: unknown } => {
  const f = API_FIXTURES[key];
  if (f === undefined) throw new Error(`no fixture for ${key}`);
  if (f.schema === null) return { status: f.status, body: null };
  const r = f.schema.safeParse(f.body);
  if (!r.success) throw new Error(`fixture ${key} does not parse: ${r.error.message}`);
  return { status: f.status, body: f.body };
};
