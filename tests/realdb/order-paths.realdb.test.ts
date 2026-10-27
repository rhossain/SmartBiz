/**
 * tests/realdb/order-paths.realdb.test.ts — the order and audit paths on a
 * real Postgres (CI job `realdb`; Build and Test T-REALDB / T-JSONB).
 *
 * Why this suite exists: the unit and integration suites run against
 * tests/helpers/sql-stub.ts, which cannot see `FOR UPDATE`,
 * `ANY($1::uuid[])`, the keyset cursor, the real role grants or how
 * postgres.js types a JSONB parameter. Build and Test found a defect only
 * a real database shows (JSONB written as a JSON string), so CI runs this
 * suite against a `postgres:18` service container.
 *
 * Two connections, on purpose:
 *   REALDB_ADMIN_URL — superuser; seeds the two businesses and reads back
 *                      `jsonb_typeof`, which the app role may not need.
 *   REALDB_APP_URL   — a login role that is a member of `app_role`; every
 *                      order call runs as the application would.
 * Migrations must already be applied (`bun run migrate`). The suite is not
 * part of `bun run test`; it runs only when both URLs are set, and the CI
 * job fails first if they are not.
 */
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import postgres from "postgres";
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
import type { Uuid } from "../../src/types/uuid.js";

const adminUrl = process.env["REALDB_ADMIN_URL"];
const appUrl = process.env["REALDB_APP_URL"];
const enabled = adminUrl !== undefined && appUrl !== undefined;

const BUSINESS_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" as Uuid;
const BUSINESS_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" as Uuid;
const OWNER_A = "11111111-1111-4111-8111-111111111111" as Uuid;
const OWNER_B = "22222222-2222-4222-8222-222222222222" as Uuid;

const ctxA: OrderContext = { businessId: BUSINESS_A, actorUserId: OWNER_A, role: "owner" };
const ctxB: OrderContext = { businessId: BUSINESS_B, actorUserId: OWNER_B, role: "owner" };

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

describe.skipIf(!enabled)("orders on real Postgres", () => {
  const admin = postgres(adminUrl ?? "", { max: 1, prepare: false });
  const app = postgres(appUrl ?? "", { max: 2, prepare: false });

  beforeAll(async () => {
    await admin`
      INSERT INTO users (id, email, password_hash, role) VALUES
        (${OWNER_A}, 'owner-a@realdb.test', 'x', 'owner'),
        (${OWNER_B}, 'owner-b@realdb.test', 'x', 'owner')
      ON CONFLICT DO NOTHING
    `;
    await admin`
      INSERT INTO businesses (id, name, owner_user_id) VALUES
        (${BUSINESS_A}, 'A', ${OWNER_A}),
        (${BUSINESS_B}, 'B', ${OWNER_B})
      ON CONFLICT DO NOTHING
    `;
  });

  afterAll(async () => {
    await app.end({ timeout: 5 });
    await admin.end({ timeout: 5 });
  });

  test("create, edit, transition and link work as the app role, one audit row each", async () => {
    const created = await createOrder(app, ctxA, manual());
    if (!created.ok) throw new Error(`create failed: ${created.error.kind}`);
    // 2 × 1250 − 50 + 1 × 1250 − 50 − 100 + 60 taka, in paise.
    expect(created.value.totalPaise).toBe(361_000);
    const id = created.value.id;

    const edited = await updateOrder(app, ctxA, id, { deliveryChargePaise: 8_000 });
    expect(edited.ok && edited.value.totalPaise).toBe(363_000);

    // The FOR UPDATE path on a real row lock.
    const confirmed = await transitionStatus(app, ctxA, id, "confirmed");
    expect(confirmed.ok && confirmed.value.status).toBe("confirmed");
    const packed = await transitionStatus(app, ctxA, id, "packed");
    expect(packed.ok && packed.value.status).toBe("packed");

    const linked = await linkConsignment(app, ctxA, { orderId: id, consignmentRef: "PT-1234" });
    expect(linked.ok && linked.value.courier).toBe("pathao");
    const again = await linkConsignment(app, ctxA, { orderId: id, consignmentRef: "PT-5678" });
    expect(again.ok ? "linked twice" : again.error.kind).toBe("already_linked");

    const rows = await admin<{ action: string }[]>`
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
    const created = await createOrder(app, ctxA, manual());
    if (!created.ok) throw new Error(`create failed: ${created.error.kind}`);
    const id = created.value.id;
    const [order] = await admin<
      { t: string }[]
    >`SELECT jsonb_typeof(contact) AS t FROM orders WHERE id = ${id}`;
    const [audit] = await admin<{ t: string }[]>`
      SELECT jsonb_typeof(payload) AS t FROM audit_log WHERE subject_id = ${id} AND action = 'order.create'
    `;
    expect(order?.t).toBe("object");
    expect(audit?.t).toBe("object");
  });

  test("keyset paging returns disjoint pages; another business sees nothing", async () => {
    for (let i = 0; i < 4; i++) {
      await createOrder(app, ctxA, manual({ source: "quick-add", contact: null, items: [line()] }));
    }
    const first = await listOrders(app, ctxA, { limit: 2 });
    if (!first.ok || first.value.nextCursor === null) throw new Error("expected a second page");
    const second = await listOrders(app, ctxA, { limit: 2, cursor: first.value.nextCursor });
    if (!second.ok) throw new Error("second page failed");
    const firstIds = new Set(first.value.orders.map((o) => o.id));
    expect(second.value.orders.length).toBeGreaterThan(0);
    expect(second.value.orders.some((o) => firstIds.has(o.id))).toBe(false);

    const someId = first.value.orders[0]?.id ?? "";
    const cross = await getOrder(app, ctxB, someId);
    expect(cross.ok ? "visible" : cross.error.kind).toBe("not_found");
  });

  test("the app role cannot UPDATE or DELETE audit rows (R1.1 on a real database)", async () => {
    const sqlState = async (run: () => Promise<unknown>): Promise<string> => {
      try {
        await run();
        return "allowed";
      } catch (e) {
        return (e as { code?: string }).code ?? "unknown";
      }
    };
    expect(await sqlState(() => app`UPDATE audit_log SET action = 'x'`)).toBe("42501");
    expect(await sqlState(() => app`DELETE FROM audit_log`)).toBe("42501");
  });

  test("an order total past MAX_SAFE_INTEGER is refused and the list stays readable", async () => {
    const huge = await createOrder(
      app,
      ctxA,
      manual({
        items: Array.from({ length: 200 }, () =>
          line({ quantity: 9_999, unitPricePaise: 1_000_000_000_000, lineDiscountPaise: 0 }),
        ),
        orderDiscountPaise: 0,
      }),
    );
    expect(huge.ok ? "stored" : huge.error.kind).toBe("invalid_input");
    const list = await listOrders(app, ctxA, {});
    expect(list.ok).toBe(true);
  });
});
