/**
 * tests/unit/order-schema.test.ts — B2 data layer (FR5.1, FR5.3, NFR5.5, R1.1).
 *
 * Two halves:
 *   1. The zod boundary validators accept a well-formed order and refuse
 *      the inputs the plan names (empty or oversized item lists, float or
 *      negative paise, out-of-range quantity, a bad phone or consignment
 *      ref, an unknown status).
 *   2. The 0008–0010 migrations, read as text (no DATABASE_URL needed, the
 *      same approach as the R1.1 gate): the status CHECK lists exactly the
 *      nine values, restated inline here rather than imported, every
 *      statement is in a re-runnable form, and nothing grants UPDATE or
 *      DELETE on audit_log or DELETE on orders.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import {
  ConsignmentLinkInputSchema,
  CreateOrderInputSchema,
  ListOrdersFilterSchema,
  OrderSchema,
  OrderStatusSchema,
  UpdateOrderInputSchema,
} from "../../src/data/zod-schemas.js";

const migrationsDir = join(import.meta.dir, "..", "..", "src", "db", "migrations");
const read = (f: string): string => readFileSync(join(migrationsDir, f), "utf8");
const B2_MIGRATIONS = [
  "0008_create_orders.sql",
  "0009_create_order_items.sql",
  "0010_create_consignment_link.sql",
] as const;

/** Statement list with `--` comments removed. */
const statements = (sqlText: string): string[] =>
  sqlText
    .split("\n")
    .filter((l) => !l.trim().startsWith("--"))
    .join("\n")
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

/** Values inside `<column> TEXT ... CHECK (<column> IN (...))`. */
const checkValues = (sqlText: string, column: string): string[] => {
  const re = new RegExp(`CHECK \\(${column} IN \\(([^)]*)\\)`, "m");
  const m = sqlText.match(re);
  if (!m || m[1] === undefined) return [];
  return m[1]
    .split(",")
    .map((s) => s.trim().replace(/^'|'$/g, ""))
    .filter((s) => s.length > 0);
};

const validItem = {
  variantId: null,
  description: "কালো কুর্তি M",
  quantity: 2,
  unitPricePaise: 125_000,
  lineDiscountPaise: 0,
};

const validCreate = {
  source: "manual",
  customerId: null,
  contact: { name: "ফারজানা", phone: "01711234567", address: "উত্তরা, ঢাকা" },
  repeatOfOrderId: null,
  items: [validItem],
  orderDiscountPaise: 0,
  deliveryChargePaise: 6_000,
};

describe("B2 zod boundary validators", () => {
  test("a well-formed create input is accepted", () => {
    expect(CreateOrderInputSchema.safeParse(validCreate).success).toBe(true);
  });

  test("an order with no items or more than 200 items is refused", () => {
    expect(CreateOrderInputSchema.safeParse({ ...validCreate, items: [] }).success).toBe(false);
    const many = Array.from({ length: 201 }, () => validItem);
    expect(CreateOrderInputSchema.safeParse({ ...validCreate, items: many }).success).toBe(false);
    const max = Array.from({ length: 200 }, () => validItem);
    expect(CreateOrderInputSchema.safeParse({ ...validCreate, items: max }).success).toBe(true);
  });

  test("money must be non-negative integer paise", () => {
    const float = { ...validItem, unitPricePaise: 1250.5 };
    const negative = { ...validItem, lineDiscountPaise: -1 };
    expect(CreateOrderInputSchema.safeParse({ ...validCreate, items: [float] }).success).toBe(false);
    expect(CreateOrderInputSchema.safeParse({ ...validCreate, items: [negative] }).success).toBe(false);
    expect(CreateOrderInputSchema.safeParse({ ...validCreate, deliveryChargePaise: -100 }).success).toBe(false);
  });

  test("quantity, phone, source and status are range-checked", () => {
    expect(CreateOrderInputSchema.safeParse({ ...validCreate, items: [{ ...validItem, quantity: 0 }] }).success).toBe(false);
    expect(
      CreateOrderInputSchema.safeParse({
        ...validCreate,
        contact: { name: null, phone: "1711234567", address: null },
      }).success,
    ).toBe(false);
    expect(CreateOrderInputSchema.safeParse({ ...validCreate, source: "fax" }).success).toBe(false);
    expect(OrderStatusSchema.safeParse("refunded").success).toBe(false);
    expect(OrderStatusSchema.safeParse("partial").success).toBe(true);
  });

  test("consignment refs follow the three courier formats only", () => {
    const orderId = "6f1c1d0e-6f1c-4d0e-8f1c-1d0e6f1c1d0e";
    for (const ref of ["PT-1234", "SF-12345", "RX-12345"]) {
      expect(ConsignmentLinkInputSchema.safeParse({ orderId, consignmentRef: ref }).success).toBe(true);
    }
    for (const ref of ["PT-123", "SF-1234", "XX-12345", "rx-12345", ""]) {
      expect(ConsignmentLinkInputSchema.safeParse({ orderId, consignmentRef: ref }).success).toBe(false);
    }
  });

  test("update, list and entity schemas enforce their bounds", () => {
    expect(UpdateOrderInputSchema.safeParse({}).success).toBe(true);
    expect(UpdateOrderInputSchema.safeParse({ items: [] }).success).toBe(false);
    expect(ListOrdersFilterSchema.safeParse({ limit: 50 }).success).toBe(true);
    expect(ListOrdersFilterSchema.safeParse({ limit: 1001 }).success).toBe(false);
    expect(ListOrdersFilterSchema.safeParse({ limit: 0 }).success).toBe(false);
    expect(OrderSchema.safeParse({ orderNo: "ORD-12" }).success).toBe(false);
  });
});

describe("B2 migrations 0008–0010", () => {
  test("all three files are present and sort after the B1 set", () => {
    const files = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
    expect(files.length).toBe(10);
    expect(files.slice(7)).toEqual([...B2_MIGRATIONS]);
  });

  test("the status CHECK lists exactly the nine affirmed values", () => {
    // Restated inline (team.md §TP-4), not imported from src/orders/types.ts.
    const NINE = ["new", "confirmed", "packed", "shipped", "delivered", "settled", "cancelled", "returned", "partial"];
    const values = checkValues(read("0008_create_orders.sql"), "status");
    expect(values.length).toBe(9);
    expect([...values].sort()).toEqual([...NINE].sort());
  });

  test("the source CHECK lists exactly the seven input modes", () => {
    const SEVEN = ["paste-parse", "manual", "repeat", "quick-add", "photo", "spreadsheet", "voice"];
    const values = checkValues(read("0008_create_orders.sql"), "source");
    expect([...values].sort()).toEqual([...SEVEN].sort());
  });

  test("money columns are integer paise, never numeric or float", () => {
    for (const f of B2_MIGRATIONS) {
      const body = statements(read(f)).join(";\n");
      const paiseColumns = body.split("\n").filter((l) => /^\s*\w+_paise\s/.test(l));
      if (f !== "0010_create_consignment_link.sql") expect(paiseColumns.length).toBeGreaterThan(0);
      for (const line of paiseColumns) {
        expect(line).toMatch(/_paise\s+BIGINT/);
      }
      expect(body).not.toMatch(/\b(NUMERIC|DECIMAL|REAL|DOUBLE PRECISION|FLOAT)\b/i);
    }
  });

  test("every statement is re-runnable (idempotent)", () => {
    for (const f of B2_MIGRATIONS) {
      for (const s of statements(read(f))) {
        const idempotent =
          /^CREATE (TABLE|INDEX|SEQUENCE) IF NOT EXISTS/i.test(s) || /^(GRANT|REVOKE)\s/i.test(s);
        expect({ file: f, statement: s.slice(0, 60), idempotent }).toEqual({
          file: f,
          statement: s.slice(0, 60),
          idempotent: true,
        });
      }
    }
  });

  test("no B2 migration grants UPDATE/DELETE on audit_log, or DELETE on orders", () => {
    for (const f of B2_MIGRATIONS) {
      const body = read(f);
      expect(body).not.toMatch(/GRANT[^;]*ON\s+audit_log/i);
      expect(body).not.toMatch(/GRANT[^;]*DELETE[^;]*ON\s+orders\b/i);
    }
    const consignment = read("0010_create_consignment_link.sql");
    expect(consignment).toMatch(/GRANT SELECT, INSERT ON consignment_link TO app_role/);
    expect(consignment).toMatch(/REVOKE UPDATE, DELETE, TRUNCATE ON consignment_link FROM app_role/);
  });
});
