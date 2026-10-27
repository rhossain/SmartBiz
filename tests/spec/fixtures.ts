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
  HealthResponseSchema,
  SessionResponseSchema,
  SetupResponseSchema,
} from "../../src/auth/schemas.js";
import { OrderResponseSchema, OrdersPageResponseSchema } from "../../src/orders/schemas.js";
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

const userId = (role: Role): string =>
  `a${["owner", "manager", "sales_staff", "accountant"].indexOf(role) + 1}000000-0000-4000-8000-0000000000a1`;

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
