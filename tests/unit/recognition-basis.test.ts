/**
 * tests/unit/recognition-basis.test.ts — ADR-002.
 * Every MoneyFigure carries a recognition; the basis pill UI
 * exposes the recognition so a "৳ 18,400" total can never be
 * silently half earned and half realized.
 */
import { describe, expect, test } from "bun:test";
import { add, money, toTaka } from "../../src/money/money-figure.js";
import { econ } from "../../src/money/econ.js";
import { summary } from "../../src/money/summary.js";

describe("recognition-basis invariant (ADR-002)", () => {
  test("MoneyFigure always carries recognition", () => {
    const a = money(1000, "earned");
    const b = money(2000, "realized");
    expect(a.recognition).toBe("earned");
    expect(b.recognition).toBe("realized");
  });

  test("earned and realized cannot be summed directly", () => {
    const a = money(1000, "earned");
    const b = money(2000, "realized");
    expect(() => add(a, b)).toThrow();
  });

  test("econ() returns the basis it was asked for (single basis only)", () => {
    const figs = [money(100, "earned"), money(200, "realized"), money(300, "earned")];
    const earned = econ(figs, "earned");
    expect(earned.recognition).toBe("earned");
    expect(earned.paise).toBe(400);
    const realized = econ(figs, "realized");
    expect(realized.recognition).toBe("realized");
    expect(realized.paise).toBe(200);
  });

  test("summary counts both bases and completeness", () => {
    const figs = [
      money(100, "earned", "complete"),
      money(200, "earned", "partial"),
      money(300, "realized", "complete"),
    ];
    const s = summary(figs);
    expect(s.earned).toBe(2);
    expect(s.realized).toBe(1);
    expect(s.complete).toBe(2);
    expect(s.partial).toBe(1);
    expect(s.unknown).toBe(0);
  });

  test("toTaka renders 2 dp", () => {
    const a = money(12345, "earned");
    expect(toTaka(a)).toBe("৳123.45");
  });
});
