/**
 * tests/unit/status-fsm.test.ts — the order status machine (FR5.3, US1.17).
 *
 * The expected graph is restated inline: forward path, the two
 * terminals, `partial` reachable from every non-terminal state, and
 * cancelling only before the parcel leaves (or from partial).
 */
import { describe, expect, test } from "bun:test";
import {
  canTransition,
  isEditable,
  isOrderStatus,
  isTerminal,
  nextStatuses,
} from "../../src/orders/status-fsm.js";
import { statusLabel } from "../../src/pres/status-labels.js";
import type { OrderStatus } from "../../src/data/enums.js";

const ALL: ReadonlyArray<OrderStatus> = [
  "new",
  "confirmed",
  "packed",
  "shipped",
  "delivered",
  "settled",
  "cancelled",
  "returned",
  "partial",
];
const TERMINAL: ReadonlyArray<OrderStatus> = ["cancelled", "returned"];
const NON_TERMINAL = ALL.filter((s) => !TERMINAL.includes(s));

describe("order status FSM", () => {
  test("the forward path new → … → settled is allowed step by step", () => {
    const path: OrderStatus[] = ["new", "confirmed", "packed", "shipped", "delivered", "settled"];
    for (let i = 0; i < path.length - 1; i += 1) {
      expect(canTransition(path[i]!, path[i + 1]!)).toBe(true);
    }
  });

  test("skipping a step, going backwards or staying put is refused", () => {
    expect(canTransition("new", "delivered")).toBe(false);
    expect(canTransition("confirmed", "settled")).toBe(false);
    expect(canTransition("shipped", "packed")).toBe(false);
    expect(canTransition("settled", "delivered")).toBe(false);
    for (const s of ALL) expect(canTransition(s, s)).toBe(false);
  });

  test("cancelled and returned are terminal", () => {
    for (const s of TERMINAL) {
      expect(isTerminal(s)).toBe(true);
      expect(nextStatuses(s)).toEqual([]);
      for (const to of ALL) expect(canTransition(s, to)).toBe(false);
    }
    for (const s of NON_TERMINAL) expect(isTerminal(s)).toBe(false);
  });

  test("partial is enterable from every non-terminal state", () => {
    for (const s of NON_TERMINAL.filter((x) => x !== "partial")) {
      expect({ from: s, ok: canTransition(s, "partial") }).toEqual({ from: s, ok: true });
    }
    expect(nextStatuses("partial")).toEqual(["delivered", "settled", "returned", "cancelled"]);
  });

  test("cancel only before shipping (or from partial); return only after shipping", () => {
    const canCancel = ALL.filter((s) => canTransition(s, "cancelled"));
    expect(canCancel).toEqual(["new", "confirmed", "packed", "partial"]);
    const canReturn = ALL.filter((s) => canTransition(s, "returned"));
    expect(canReturn).toEqual(["shipped", "delivered", "settled", "partial"]);
  });

  test("only new and confirmed orders are editable", () => {
    expect(ALL.filter(isEditable)).toEqual(["new", "confirmed"]);
  });

  test("labels are bilingual and the guard accepts exactly the nine values", () => {
    for (const s of ALL) {
      const l = statusLabel(s);
      expect(l.bn.length).toBeGreaterThan(0);
      expect(l.en.length).toBeGreaterThan(0);
      expect(isOrderStatus(s)).toBe(true);
    }
    for (const bad of ["refunded", "NEW", "", 3, null]) expect(isOrderStatus(bad)).toBe(false);
  });
});
