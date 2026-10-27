/**
 * tests/unit/order-audit-append.test.ts — R2.1 (NFR5.7, FR12.3).
 *
 * Every order mutation appends exactly one audit row, with the right
 * action, subject, actor and before/after, and the audit insert reaches
 * the database before the entity write. `insertAudit` is NOT mocked:
 * the assertions read the rows the SQL stub actually stored, and the
 * statement order the stub recorded.
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { FROZEN_TEST_NOW, resetTestClock, setTestClock } from "../../src/data/clock.js";
import { createOrder } from "../../src/orders/create-order.js";
import { updateOrder } from "../../src/orders/update-order.js";
import { transitionStatus } from "../../src/orders/transition-status.js";
import { linkConsignment } from "../../src/orders/consignment.js";
import type { Order } from "../../src/orders/types.js";
import { makeSqlStub, type RecordedCall } from "../helpers/sql-stub.js";
import {
  BUSINESS_A,
  OWNER_A,
  auditPayload,
  createInput,
  ctxFor,
  itemInput,
} from "../helpers/order-fixtures.js";

const ctx = ctxFor(BUSINESS_A, OWNER_A);

const indexOf = (calls: ReadonlyArray<RecordedCall>, re: RegExp): number =>
  calls.findIndex((c) => re.test(c.text));

const seedOrder = async (stub: ReturnType<typeof makeSqlStub>): Promise<Order> => {
  const r = await createOrder(stub.sql, ctx, createInput());
  if (!r.ok) throw new Error(`seed failed: ${JSON.stringify(r.error)}`);
  return r.value;
};

beforeEach(() => setTestClock(FROZEN_TEST_NOW));
afterEach(() => resetTestClock());

describe("R-05 — no customer PII in the audit log", () => {
  // Rule restated: audit_log is insert-only for 5 years, so a customer's
  // name, phone and address must never be written to it. The payload keeps
  // which contact fields were present and whether an update changed them.
  const PII = ["ফারজানা আক্তার", "01711234567", "উত্তরা, ঢাকা"];
  const noPii = (row: Record<string, unknown>): void => {
    const raw = String(row["payload"]);
    for (const value of PII)
      expect({ value, inAudit: raw.includes(value) }).toEqual({ value, inAudit: false });
  };

  test("create keeps the contact on the order, only its field summary in the audit row", async () => {
    const stub = makeSqlStub();
    const order = await seedOrder(stub);
    expect(order.contact?.phone).toBe("01711234567");
    const row = stub.state.auditLog[0]!;
    noPii(row);
    expect((auditPayload(row).after as { contact: unknown }).contact).toEqual({
      present: true,
      fields: ["name", "phone", "address"],
    });
  });

  test("update and every later action write no PII; a contact edit is flagged, not copied", async () => {
    const stub = makeSqlStub();
    const order = await seedOrder(stub);
    await updateOrder(stub.sql, ctx, order.id, {
      contact: { name: "রিনা", phone: "01811111111", address: null },
    });
    await updateOrder(stub.sql, ctx, order.id, { deliveryChargePaise: 8_000 });
    await transitionStatus(stub.sql, ctx, order.id, "confirmed");
    for (const row of stub.state.auditLog) {
      noPii(row);
      expect(String(row["payload"]).includes("01811111111")).toBe(false);
    }
    const [, edit, noEdit] = stub.state.auditLog.map((r) => JSON.parse(String(r["payload"])));
    expect(edit.contactChanged).toBe(true);
    expect(edit.after.contact).toEqual({ present: true, fields: ["name", "phone"] });
    expect(noEdit.contactChanged).toBe(false);
  });
});

describe("R2.1 — order audit append per action", () => {
  test("createOrder: one row, action order.create, before null, after the order; audit first", async () => {
    const stub = makeSqlStub();
    const order = await seedOrder(stub);
    expect(stub.state.auditLog.length).toBe(1);
    const row = stub.state.auditLog[0]!;
    expect(row["action"]).toBe("order.create");
    expect(row["subject_kind"]).toBe("order");
    expect(row["subject_id"]).toBe(order.id);
    expect(row["actor_user_id"]).toBe(OWNER_A);
    expect(row["business_id"]).toBe(BUSINESS_A);
    expect(row["correlation_id"]).toBe("test-correlation-0001");
    const payload = auditPayload(row);
    expect(payload.before).toBeNull();
    expect((payload.after as Order).totalPaise).toBe(order.totalPaise);
    expect((payload.after as Order).items.length).toBe(2);
    expect(indexOf(stub.calls, /INSERT INTO audit_log/)).toBeLessThan(
      indexOf(stub.calls, /INSERT INTO orders \(/),
    );
    expect(indexOf(stub.calls, /INSERT INTO audit_log/)).toBeLessThan(
      indexOf(stub.calls, /INSERT INTO order_items/),
    );
  });

  test("updateOrder: one row, action order.update, before and after totals differ; audit first", async () => {
    const stub = makeSqlStub();
    const order = await seedOrder(stub);
    stub.calls.length = 0;
    const r = await updateOrder(stub.sql, ctx, order.id, { items: [itemInput({ quantity: 5 })] });
    expect(r.ok).toBe(true);
    expect(stub.state.auditLog.length).toBe(2);
    const row = stub.state.auditLog[1]!;
    expect(row["action"]).toBe("order.update");
    expect(row["subject_id"]).toBe(order.id);
    const payload = auditPayload(row);
    expect((payload.before as Order).totalPaise).toBe(order.totalPaise);
    // 5 × 1 250.00 − 100.00 discount + 60.00 delivery, restated in paise.
    expect((payload.after as Order).totalPaise).toBe(5 * 125_000 - 10_000 + 6_000);
    expect(indexOf(stub.calls, /INSERT INTO audit_log/)).toBeLessThan(
      indexOf(stub.calls, /UPDATE orders/),
    );
    expect(indexOf(stub.calls, /INSERT INTO audit_log/)).toBeLessThan(
      indexOf(stub.calls, /DELETE FROM order_items/),
    );
  });

  test("transitionStatus: one row with before/after status; audit first", async () => {
    const stub = makeSqlStub();
    const order = await seedOrder(stub);
    stub.calls.length = 0;
    const r = await transitionStatus(stub.sql, ctx, order.id, "confirmed");
    expect(r.ok).toBe(true);
    const row = stub.state.auditLog[1]!;
    expect(row["action"]).toBe("order.status.transition");
    expect(auditPayload(row)).toEqual({
      before: { status: "new" },
      after: { status: "confirmed" },
    });
    expect(indexOf(stub.calls, /INSERT INTO audit_log/)).toBeLessThan(
      indexOf(stub.calls, /UPDATE orders SET status/),
    );
    expect(stub.state.orders[0]!["status"]).toBe("confirmed");
  });

  test("linkConsignment: one row with the link as after; audit first", async () => {
    const stub = makeSqlStub();
    const order = await seedOrder(stub);
    for (const to of ["confirmed", "packed"] as const)
      await transitionStatus(stub.sql, ctx, order.id, to);
    stub.calls.length = 0;
    const r = await linkConsignment(stub.sql, ctx, {
      orderId: order.id,
      consignmentRef: "PT-1234",
    });
    expect(r.ok).toBe(true);
    expect(stub.state.auditLog.length).toBe(4);
    const row = stub.state.auditLog[3]!;
    expect(row["action"]).toBe("order.consignment.link");
    expect((auditPayload(row).after as { consignmentRef: string }).consignmentRef).toBe("PT-1234");
    expect(indexOf(stub.calls, /INSERT INTO audit_log/)).toBeLessThan(
      indexOf(stub.calls, /INSERT INTO consignment_link/),
    );
  });

  test("a refused mutation writes no audit row (forbidden transition, not editable, wrong role)", async () => {
    const stub = makeSqlStub();
    const order = await seedOrder(stub);
    const bad = await transitionStatus(stub.sql, ctx, order.id, "settled");
    expect(bad.ok).toBe(false);
    for (const to of ["confirmed", "packed"] as const)
      await transitionStatus(stub.sql, ctx, order.id, to);
    const locked = await updateOrder(stub.sql, ctx, order.id, { deliveryChargePaise: 0 });
    expect(locked.ok).toBe(false);
    if (!locked.ok) expect(locked.error.kind).toBe("not_editable");
    const accountant = await createOrder(
      stub.sql,
      ctxFor(BUSINESS_A, OWNER_A, "accountant"),
      createInput(),
    );
    expect(accountant.ok).toBe(false);
    if (!accountant.ok) expect(accountant.error.kind).toBe("forbidden");
    // create + confirmed + packed only.
    expect(stub.state.auditLog.map((r) => r["action"])).toEqual([
      "order.create",
      "order.status.transition",
      "order.status.transition",
    ]);
  });

  test("a failed entity write rolls the audit row back with it", async () => {
    const stub = makeSqlStub({ failOn: /INSERT INTO orders \(/ });
    await expect(createOrder(stub.sql, ctx, createInput())).rejects.toThrow(
      "simulated database failure",
    );
    expect(stub.state.auditLog.length).toBe(0);
    expect(stub.state.orders.length).toBe(0);
  });

  test("the application role cannot rewrite audit_log (UPDATE and DELETE are refused)", async () => {
    const stub = makeSqlStub();
    await seedOrder(stub);
    await expect(
      Promise.resolve().then(() => stub.sql`UPDATE audit_log SET action = ${"x"}`),
    ).rejects.toThrow("permission denied");
    await expect(
      Promise.resolve().then(() => stub.sql`DELETE FROM audit_log WHERE id = ${"y"}`),
    ).rejects.toThrow("permission denied");
    expect(stub.state.auditLog.length).toBe(1);
  });
});
