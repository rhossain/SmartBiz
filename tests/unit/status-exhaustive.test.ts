/**
 * tests/unit/status-exhaustive.test.ts — R2.4 (FR5.3, team.md §TP-4).
 *
 * The nine values are restated inline and must equal the shipped union
 * exactly. Every status-switching function in src/orders/ must handle
 * every value; the `never`-asserted default is the compile-time guard,
 * and its runtime face is checked here: a value outside the union
 * reaches `assertNever` and throws, so deleting a `case` turns that
 * status into a throw and fails "every value is handled".
 */
import { describe, expect, test } from "bun:test";
import { ORDER_STATUSES, assertNever, type OrderStatus } from "../../src/orders/types.js";
import { isEditable, nextStatuses, statusLabel } from "../../src/orders/status-fsm.js";
import { canLinkConsignment } from "../../src/orders/consignment.js";
import { bucketOf, orderMoneyFigure } from "../../src/orders/status-bucket.js";

const NINE = ["new", "confirmed", "packed", "shipped", "delivered", "settled", "cancelled", "returned", "partial"];

const SWITCHES: ReadonlyArray<readonly [string, (s: OrderStatus) => unknown]> = [
  ["nextStatuses", nextStatuses],
  ["statusLabel", statusLabel],
  ["isEditable", isEditable],
  ["canLinkConsignment", canLinkConsignment],
  ["bucketOf", bucketOf],
  ["orderMoneyFigure", (s) => orderMoneyFigure({ status: s, totalPaise: 100 })],
];

describe("R2.4 — status enum is exhaustive", () => {
  test("exactly nine values, in the affirmed set, none collapsed or added", () => {
    expect(ORDER_STATUSES.length).toBe(9);
    expect([...ORDER_STATUSES] as string[]).toEqual(NINE);
    expect(new Set(ORDER_STATUSES).size).toBe(9);
  });

  test("every status-switching function handles every value", () => {
    for (const [name, fn] of SWITCHES) {
      for (const s of NINE as OrderStatus[]) {
        let threw = false;
        try {
          fn(s);
        } catch {
          threw = true;
        }
        expect({ fn: name, status: s, threw }).toEqual({ fn: name, status: s, threw: false });
      }
    }
  });

  test("a value outside the union reaches the never-asserted default and throws", () => {
    const outsider = "refunded" as never;
    expect(() => nextStatuses(outsider)).toThrow("Unhandled order status: refunded");
    expect(() => statusLabel(outsider)).toThrow("Unhandled order status");
    expect(() => isEditable(outsider)).toThrow("Unhandled order status");
    expect(() => canLinkConsignment(outsider)).toThrow("Unhandled order status");
    expect(() => assertNever(outsider, "thing")).toThrow("Unhandled thing: refunded");
  });
});
