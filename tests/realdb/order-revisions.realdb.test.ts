/**
 * tests/realdb/order-revisions.realdb.test.ts — append-only order lines and atomic writes on
 * a real Postgres, as the app login (BR6.8, BR6.10; R3, NFR7.5; amendment A3).
 *
 * - Two edits leave three revisions in the table; reads return only the latest.
 * - The app login cannot DELETE order_items at all.
 * - Atomicity (R3): a failure injected through `Queryable` on the first statement after the
 *   audit insert rolls back the audit row and the entity write together. The injection wraps
 *   the transaction handle in the test; production code has no test hook.
 */
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type postgres from "postgres";
import type { Uuid } from "../../src/data/uuid.js";
import { createOrder } from "../../src/orders/create-order.js";
import { getOrder } from "../../src/orders/get-order.js";
import { updateOrder } from "../../src/orders/update-order.js";
import type { CreateOrderInput, OrderContext } from "../../src/orders/types.js";
import { freshDatabase, realdbEnabled, sqlState, type FreshDatabase } from "./fresh-database.js";

const BUSINESS = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" as Uuid;
const OWNER = "11111111-1111-4111-8111-111111111111" as Uuid;
const ctx: OrderContext = { businessId: BUSINESS, actorUserId: OWNER, role: "owner" };

const input = (description: string, quantity = 1): CreateOrderInput => ({
  source: "manual",
  customerId: null,
  contact: null,
  repeatOfOrderId: null,
  items: [{ variantId: null, description, quantity, unitPricePaise: 10_000, lineDiscountPaise: 0 }],
  orderDiscountPaise: 0,
  deliveryChargePaise: 0,
});

/**
 * A `Sql` whose transactions throw on the first statement after `INSERT INTO audit_log`.
 * The proxy forwards everything else unchanged.
 */
const failAfterAudit = (sql: postgres.Sql): postgres.Sql =>
  new Proxy(sql, {
    get(target, prop, receiver) {
      if (prop !== "begin") return Reflect.get(target, prop, receiver);
      return (fn: (tx: postgres.TransactionSql) => Promise<unknown>) =>
        target.begin(async (tx) => {
          let auditWritten = false;
          const wrapped = new Proxy(tx, {
            apply(t, thisArg, args: unknown[]) {
              const strings = args[0] as TemplateStringsArray;
              if (auditWritten) throw new Error("injected failure after the audit insert");
              if (strings.join("?").includes("INSERT INTO audit_log")) auditWritten = true;
              return Reflect.apply(t as unknown as (...a: unknown[]) => unknown, thisArg, args);
            },
          });
          return fn(wrapped);
        });
    },
  });

describe.skipIf(!realdbEnabled)("order line revisions on real Postgres", () => {
  let db: FreshDatabase;

  beforeAll(async () => {
    db = await freshDatabase("revisions");
    await db.admin.begin(async (tx) => {
      await tx`INSERT INTO users (id, email, password_hash, role, business_id)
               VALUES (${OWNER}, 'owner@realdb.test', 'x', 'owner', ${BUSINESS})`;
      await tx`INSERT INTO businesses (id, name, owner_user_id) VALUES (${BUSINESS}, 'A', ${OWNER})`;
    });
  });

  afterAll(async () => {
    await db.drop();
  });

  test("two edits keep three revisions; reads return only the latest", async () => {
    const created = await createOrder(db.app, ctx, input("প্রথম"));
    if (!created.ok) throw new Error(`create failed: ${created.error.kind}`);
    const id = created.value.id;
    await updateOrder(db.app, ctx, id, { items: input("দ্বিতীয়", 2).items });
    const last = await updateOrder(db.app, ctx, id, { items: input("তৃতীয়", 3).items });
    expect(last.ok && last.value.itemsRevision).toBe(3);

    const all = await db.admin<{ revision: number; description: string }[]>`
      SELECT revision, description FROM order_items WHERE order_id = ${id} ORDER BY revision
    `;
    expect(all.map((r) => [r.revision, r.description])).toEqual([
      [1, "প্রথম"],
      [2, "দ্বিতীয়"],
      [3, "তৃতীয়"],
    ]);
    const read = await getOrder(db.app, ctx, id);
    expect(read.ok && read.value.items.map((i) => i.description)).toEqual(["তৃতীয়"]);
  });

  test("the app login cannot DELETE order_items", async () => {
    expect(await sqlState(() => db.app`DELETE FROM order_items`)).toBe("42501");
  });

  test("create: a failure after the audit insert leaves neither the audit row nor the order", async () => {
    const [before] = await db.admin<{ a: number; o: number }[]>`
      SELECT (SELECT count(*)::int FROM audit_log) AS a, (SELECT count(*)::int FROM orders) AS o
    `;
    await expect(createOrder(failAfterAudit(db.app), ctx, input("ভাঙা"))).rejects.toThrow(
      /injected failure/,
    );
    const [after] = await db.admin<{ a: number; o: number }[]>`
      SELECT (SELECT count(*)::int FROM audit_log) AS a, (SELECT count(*)::int FROM orders) AS o
    `;
    expect(after).toEqual(before);
  });

  test("edit: a failure after the audit insert leaves the order and its lines unchanged", async () => {
    const created = await createOrder(db.app, ctx, input("আগের"));
    if (!created.ok) throw new Error("create failed");
    const id = created.value.id;
    const [auditBefore] = await db.admin<{ n: number }[]>`
      SELECT count(*)::int AS n FROM audit_log WHERE subject_id = ${id}
    `;
    await expect(
      updateOrder(failAfterAudit(db.app), ctx, id, { items: input("পরের").items }),
    ).rejects.toThrow(/injected failure/);
    const [auditAfter] = await db.admin<{ n: number }[]>`
      SELECT count(*)::int AS n FROM audit_log WHERE subject_id = ${id}
    `;
    expect(auditAfter?.n).toBe(auditBefore?.n);
    const read = await getOrder(db.app, ctx, id);
    expect(read.ok && [read.value.itemsRevision, read.value.items[0]?.description]).toEqual([
      1,
      "আগের",
    ]);
  });
});
