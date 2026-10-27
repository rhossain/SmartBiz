/**
 * tests/unit/status-bucket.test.ts — R2.3 (FR10.1, FR10.2, FR5.6, FR6.2).
 *
 * The bucket sets are restated inline and NEVER imported from src/
 * (FR10.2), so moving a status between buckets in the source is a
 * failing test rather than a silent re-shape of every money figure:
 *
 *   EARNED   = { delivered, settled }
 *   REALIZED = { settled }
 *   PIPELINE = { new, confirmed, packed, shipped, partial }
 *   cancelled and returned are in no bucket.
 */
import { describe, expect, test } from "bun:test";
import { bucketOf, bucketTotals, orderMoneyFigure } from "../../src/orders/status-bucket.js";
import type { OrderStatus } from "../../src/orders/types.js";

const EARNED: ReadonlyArray<OrderStatus> = ["delivered", "settled"];
const REALIZED: ReadonlyArray<OrderStatus> = ["settled"];
const PIPELINE: ReadonlyArray<OrderStatus> = ["new", "confirmed", "packed", "shipped", "partial"];
const NONE: ReadonlyArray<OrderStatus> = ["cancelled", "returned"];
const ALL: ReadonlyArray<OrderStatus> = [...PIPELINE, ...EARNED, ...NONE];

const one = (status: OrderStatus, totalPaise = 100_000) => bucketTotals([{ status, totalPaise }]);

describe("R2.3 — status-bucket math", () => {
  test("each status lands in exactly the restated buckets", () => {
    for (const s of ALL) {
      const t = one(s);
      expect({ s, earned: t.earned.paise > 0 }).toEqual({ s, earned: EARNED.includes(s) });
      expect({ s, realized: t.realized.paise > 0 }).toEqual({ s, realized: REALIZED.includes(s) });
      expect({ s, pipeline: t.pipeline.paise > 0 }).toEqual({ s, pipeline: PIPELINE.includes(s) });
    }
  });

  test("bucketOf names the narrowest bucket", () => {
    expect(ALL.map((s) => [s, bucketOf(s)])).toEqual([
      ["new", "pipeline"],
      ["confirmed", "pipeline"],
      ["packed", "pipeline"],
      ["shipped", "pipeline"],
      ["partial", "pipeline"],
      ["delivered", "earned"],
      ["settled", "realized"],
      ["cancelled", "none"],
      ["returned", "none"],
    ]);
  });

  test("cancelled and returned count in no bucket; delivered is earned but not realized", () => {
    for (const s of NONE) {
      const t = one(s);
      expect([t.earned.paise, t.realized.paise, t.pipeline.paise]).toEqual([0, 0, 0]);
      expect(t.counts.none).toBe(1);
    }
    const delivered = one("delivered");
    expect(delivered.earned.paise).toBe(100_000);
    expect(delivered.realized.paise).toBe(0);
  });

  test("totals are exact integer paise over a seeded mix", () => {
    const orders = ALL.map((status, i) => ({ status, totalPaise: 10_001 * (i + 1) }));
    const t = bucketTotals(orders);
    const sum = (set: ReadonlyArray<OrderStatus>): number =>
      orders.filter((o) => set.includes(o.status)).reduce((a, o) => a + o.totalPaise, 0);
    expect(t.earned.paise).toBe(sum(EARNED));
    expect(t.realized.paise).toBe(sum(REALIZED));
    expect(t.pipeline.paise).toBe(sum(PIPELINE));
    for (const f of [t.earned, t.realized, t.pipeline])
      expect(Number.isInteger(f.paise)).toBe(true);
    expect(t.counts).toEqual({ earned: 2, realized: 1, pipeline: 5, none: 2, total: 9 });
  });

  test("every figure carries its basis and completeness", () => {
    const mixed = bucketTotals([
      { status: "new", totalPaise: 1 },
      { status: "delivered", totalPaise: 2 },
    ]);
    expect(mixed.earned).toMatchObject({ recognition: "earned", completeness: "partial" });
    expect(mixed.realized).toMatchObject({ recognition: "realized", completeness: "partial" });
    expect(mixed.pipeline).toMatchObject({ recognition: "earned", completeness: "partial" });
    const settledOnly = bucketTotals([{ status: "settled", totalPaise: 5 }]);
    expect(settledOnly.earned.completeness).toBe("complete");
    expect(settledOnly.realized.completeness).toBe("complete");
    expect(settledOnly.pipeline.completeness).toBe("complete");
    expect(bucketTotals([]).counts.total).toBe(0);
  });

  test("one order's figure: realized only when settled; unknown completeness out of every bucket", () => {
    expect(orderMoneyFigure({ status: "settled", totalPaise: 7 })).toEqual({
      paise: 7,
      recognition: "realized",
      completeness: "complete",
    });
    expect(orderMoneyFigure({ status: "delivered", totalPaise: 7 })).toEqual({
      paise: 7,
      recognition: "earned",
      completeness: "complete",
    });
    expect(orderMoneyFigure({ status: "shipped", totalPaise: 7 })).toEqual({
      paise: 7,
      recognition: "earned",
      completeness: "partial",
    });
    expect(orderMoneyFigure({ status: "cancelled", totalPaise: 7 })).toEqual({
      paise: 7,
      recognition: "earned",
      completeness: "unknown",
    });
  });
});
