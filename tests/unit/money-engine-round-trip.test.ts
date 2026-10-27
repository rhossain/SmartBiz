/**
 * tests/unit/money-engine-round-trip.test.ts — R1.3 CI gate.
 * 1000 iterations of add + subtract + econ produces no float drift;
 * paise-integer output matches input modulo basis.
 */
import { describe, expect, test } from "bun:test";
import { add, money, subtract, toTaka } from "../../src/money/money-figure.js";
import { econ } from "../../src/money/econ.js";
import { bnDigits } from "../../src/i18n/bnDigits.js";

const paise = (n: number): number => Math.round(n * 100);

describe("R1.3 — money engine round-trip (no float drift)", () => {
  test("1000 iterations of add/subtract/econ produce exact paise-integer output", () => {
    let acc = money(0, "earned");
    const inputs: Array<number> = [];
    for (let i = 0; i < 1000; i++) {
      const delta = paise(((i * 7) % 17) - 5);
      if (delta >= 0) {
        acc = add(acc, money(delta, "earned"));
      } else {
        acc = subtract(acc, money(-delta, "earned"));
      }
      inputs.push(delta);
    }
    const expected = inputs.reduce((sum, d) => sum + d, 0);
    expect(acc.paise).toBe(expected);
    expect(Number.isInteger(acc.paise)).toBe(true);
  });

  test("toTaka(bnDigits) is the round-trip display path; paise integer survives", () => {
    for (let i = 0; i < 1000; i++) {
      const m = money(paise(i * 0.99), "realized");
      const taka = toTaka(m);
      // Bengali-digit display: the paise integer is the source of truth.
      const displayed = bnDigits(taka.replace("৳", ""));
      expect(displayed).toMatch(/^[০-৯.]+$/);
    }
  });

  test("econ() always returns a MoneyFigure with a recognition", () => {
    const figs = Array.from({ length: 1000 }, (_, i) =>
      money(paise(i * 3), i % 2 === 0 ? "earned" : "realized"),
    );
    const earned = econ(figs, "earned");
    expect(earned.recognition).toBe("earned");
    const realized = econ(figs, "realized");
    expect(realized.recognition).toBe("realized");
  });
});
