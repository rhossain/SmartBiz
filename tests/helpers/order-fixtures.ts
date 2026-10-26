/**
 * tests/helpers/order-fixtures.ts — seeds for the B2 order tests.
 *
 * Fixed ids so failures are readable, two businesses so every test can
 * probe the tenant boundary (FR12.4), and order inputs built per call so
 * no test shares mutable fixture state. The clock is frozen by each test
 * (team.md §TP-11), not here.
 */
import type { Role } from "../../src/auth/types.js";
import type { CreateOrderInput, OrderContext, OrderItemInput } from "../../src/orders/types.js";
import type { Uuid } from "../../src/types/uuid.js";

export const BUSINESS_A = "a0000000-0000-4000-8000-00000000000a" as Uuid;
export const BUSINESS_B = "b0000000-0000-4000-8000-00000000000b" as Uuid;
export const OWNER_A = "a1000000-0000-4000-8000-0000000000a1" as Uuid;
export const OWNER_B = "b1000000-0000-4000-8000-0000000000b1" as Uuid;

export const ctxFor = (businessId: Uuid, actorUserId: Uuid, role: Role = "owner"): OrderContext => ({
  businessId,
  actorUserId,
  role,
  correlationId: "test-correlation-0001",
});

export const itemInput = (overrides: Partial<OrderItemInput> = {}): OrderItemInput => ({
  variantId: null,
  description: "কালো কুর্তি M",
  quantity: 2,
  unitPricePaise: 125_000,
  lineDiscountPaise: 0,
  ...overrides,
});

export const createInput = (overrides: Partial<CreateOrderInput> = {}): CreateOrderInput => ({
  source: "manual",
  customerId: null,
  contact: { name: "ফারজানা আক্তার", phone: "01711234567", address: "উত্তরা, ঢাকা" },
  repeatOfOrderId: null,
  items: [itemInput(), itemInput({ description: "গোলাপি ওড়না", quantity: 1, unitPricePaise: 60_000 })],
  orderDiscountPaise: 10_000,
  deliveryChargePaise: 6_000,
  ...overrides,
});

/** Parse the JSON payload the stub stores for an audit row. */
export const auditPayload = (row: Record<string, unknown>): { before: unknown; after: unknown } =>
  JSON.parse(String(row["payload"])) as { before: unknown; after: unknown };
