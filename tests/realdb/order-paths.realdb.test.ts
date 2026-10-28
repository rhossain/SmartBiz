/**
 * tests/realdb/order-paths.realdb.test.ts — the order and audit paths on a real Postgres
 * (CI job `realdb`; Build and Test T-REALDB / T-JSONB; U1: BR6.5, BR6.6, NFR1.3).
 *
 * Why this suite exists: the unit and integration suites run against
 * tests/helpers/sql-stub.ts, which cannot see `FOR UPDATE`, `ANY($1::uuid[])`, the keyset
 * cursor, the real role grants or how postgres.js types a JSONB parameter. Build and Test
 * found a defect only a real database shows (JSONB written as a JSON string).
 *
 * Two connections, on purpose (see fresh-database.ts): the admin login seeds the business
 * and reads back what the app may not need; the app login (a member of `app_role`) makes
 * every order call as the application would. Since U1 a deployment holds one business
 * (businesses_singleton_idx), so "another business" is a business id that does not exist
 * here: every read and write scoped to it must find nothing (FR12.4, BR6.5).
 */
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { linkConsignment } from "../../src/orders/consignment.js";
import {
  createOrder,
  getOrder,
  listOrders,
  transitionStatus,
  updateOrder,
  type CreateOrderInput,
  type OrderContext,
  type OrderItemInput,
} from "../../src/orders/index.js";
import type { Uuid } from "../../src/data/uuid.js";
import { freshDatabase, realdbEnabled, sqlState, type FreshDatabase } from "./fresh-database.js";

const BUSINESS_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" as Uuid;
const FOREIGN_BUSINESS = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" as Uuid;
const OWNER_A = "11111111-1111-4111-8111-111111111111" as Uuid;

const ctxA: OrderContext = { businessId: BUSINESS_A, actorUserId: OWNER_A, role: "owner" };
const ctxForeign: OrderContext = {
  businessId: FOREIGN_BUSINESS,
  actorUserId: OWNER_A,
  role: "owner",
};

const line = (over: Partial<OrderItemInput> = {}): OrderItemInput => ({
  variantId: null,
  description: "কালো কুর্তি",
  quantity: 2,
  unitPricePaise: 125_000,
  lineDiscountPaise: 5_000,
  ...over,
});

const manual = (over: Partial<CreateOrderInput> = {}): CreateOrderInput => ({
  source: "manual",
  customerId: null,
  contact: { name: "রিনা", phone: "01711111111", address: null },
  repeatOfOrderId: null,
  items: [line(), line({ description: "ওড়না", quantity: 1 })],
  orderDiscountPaise: 10_000,
  deliveryChargePaise: 6_000,
  ...over,
});

describe.skipIf(!realdbEnabled)("orders on real Postgres", () => {
  let db: FreshDatabase;

  beforeAll(async () => {
    db = await freshDatabase("orderpaths");
    await db.admin.begin(async (tx) => {
      await tx`INSERT INTO users (id, email, password_hash, role, business_id)
               VALUES (${OWNER_A}, 'owner-a@realdb.test', 'x', 'owner', ${BUSINESS_A})`;
      await tx`INSERT INTO businesses (id, name, owner_user_id) VALUES (${BUSINESS_A}, 'A', ${OWNER_A})`;
    });
  });

  afterAll(async () => {
    await db.drop();
  });

  test("create, edit, transition and link work as the app role, one audit row each", async () => {
    const created = await createOrder(db.app, ctxA, manual());
    if (!created.ok) throw new Error(`create failed: ${created.error.kind}`);
    // 2 × 1250 − 50 + 1 × 1250 − 50 − 100 + 60 taka, in paise.
    expect(created.value.totalPaise).toBe(361_000);
    const id = created.value.id;

    const edited = await updateOrder(db.app, ctxA, id, { deliveryChargePaise: 8_000 });
    expect(edited.ok && edited.value.totalPaise).toBe(363_000);

    // The FOR UPDATE path on a real row lock.
    const confirmed = await transitionStatus(db.app, ctxA, id, "confirmed");
    expect(confirmed.ok && confirmed.value.status).toBe("confirmed");
    const packed = await transitionStatus(db.app, ctxA, id, "packed");
    expect(packed.ok && packed.value.status).toBe("packed");

    const linked = await linkConsignment(db.app, ctxA, { orderId: id, consignmentRef: "PT-1234" });
    expect(linked.ok && linked.value.courier).toBe("pathao");
    const again = await linkConsignment(db.app, ctxA, { orderId: id, consignmentRef: "PT-5678" });
    expect(again.ok ? "linked twice" : again.error.kind).toBe("already_linked");

    const rows = await db.admin<{ action: string }[]>`
      SELECT action FROM audit_log WHERE subject_id = ${id} ORDER BY occurred_at, id
    `;
    expect(rows.map((r) => r.action).sort()).toEqual(
      [
        "order.consignment.link",
        "order.create",
        "order.status.transition",
        "order.status.transition",
        "order.update",
      ].sort(),
    );
  });

  test("JSONB columns hold JSON objects, never a JSON string (T-JSONB)", async () => {
    const created = await createOrder(db.app, ctxA, manual());
    if (!created.ok) throw new Error(`create failed: ${created.error.kind}`);
    const id = created.value.id;
    const [order] = await db.admin<
      { t: string }[]
    >`SELECT jsonb_typeof(contact) AS t FROM orders WHERE id = ${id}`;
    const [audit] = await db.admin<{ t: string }[]>`
      SELECT jsonb_typeof(payload) AS t FROM audit_log WHERE subject_id = ${id} AND action = 'order.create'
    `;
    expect(order?.t).toBe("object");
    expect(audit?.t).toBe("object");
  });

  test("keyset paging over 120 orders returns every order once, newest first", async () => {
    for (let i = 0; i < 120; i++) {
      const r = await createOrder(
        db.app,
        ctxA,
        manual({ source: "quick-add", contact: null, items: [line()] }),
      );
      if (!r.ok) throw new Error("seed failed");
    }
    const [total] = await db.admin<{ n: number }[]>`
      SELECT count(*)::int AS n FROM orders WHERE business_id = ${BUSINESS_A}
    `;
    const seen: Array<{ id: string; at: string }> = [];
    let cursor: string | null = null;
    let pages = 0;
    do {
      const page = await listOrders(db.app, ctxA, { limit: 50, ...(cursor ? { cursor } : {}) });
      if (!page.ok) throw new Error("page failed");
      expect(page.value.orders.length).toBeLessThanOrEqual(50);
      seen.push(...page.value.orders.map((o) => ({ id: o.id, at: o.createdAt })));
      cursor = page.value.nextCursor;
      pages += 1;
    } while (cursor !== null);
    // Many orders share a millisecond: the (createdAt, id) key still neither repeats nor skips.
    expect(seen.length).toBe(total?.n ?? -1);
    expect(new Set(seen.map((s) => s.id)).size).toBe(seen.length);
    expect(pages).toBe(Math.ceil(seen.length / 50));
    const times = seen.map((s) => s.at);
    expect([...times].sort().reverse()).toEqual(times);
  });

  test("ids from another business, or not UUIDs, are not found anywhere", async () => {
    const created = await createOrder(db.app, ctxA, manual());
    if (!created.ok) throw new Error("create failed");
    const id = created.value.id;
    const kind = (r: { ok: boolean; error?: { kind: string } }): string =>
      r.ok ? "visible" : (r.error?.kind ?? "?");
    expect(kind(await getOrder(db.app, ctxForeign, id))).toBe("not_found");
    expect(kind(await updateOrder(db.app, ctxForeign, id, { deliveryChargePaise: 1 }))).toBe(
      "not_found",
    );
    expect(kind(await transitionStatus(db.app, ctxForeign, id, "confirmed"))).toBe("not_found");
    expect(kind(await getOrder(db.app, ctxA, "ORD-1001"))).toBe("not_found");
    const list = await listOrders(db.app, ctxForeign, {});
    expect(list.ok && list.value.orders.length).toBe(0);
    // The foreign business cannot even be written to: the reference refuses it (23503),
    // which is thrown, because it is not an outcome a caller can act on (team.md).
    expect(await sqlState(() => createOrder(db.app, ctxForeign, manual()))).toBe("23503");
  });

  test("the app role cannot UPDATE or DELETE audit rows (R1.1 on a real database)", async () => {
    expect(await sqlState(() => db.app`UPDATE audit_log SET action = 'x'`)).toBe("42501");
    expect(await sqlState(() => db.app`DELETE FROM audit_log`)).toBe("42501");
  });

  test("an order total past MAX_SAFE_INTEGER is refused and the list stays readable", async () => {
    const huge = await createOrder(
      db.app,
      ctxA,
      manual({
        items: Array.from({ length: 200 }, () =>
          line({ quantity: 9_999, unitPricePaise: 1_000_000_000_000, lineDiscountPaise: 0 }),
        ),
        orderDiscountPaise: 0,
      }),
    );
    expect(huge.ok ? "stored" : huge.error.kind).toBe("invalid_input");
    const list = await listOrders(db.app, ctxA, {});
    expect(list.ok).toBe(true);
  });
});
