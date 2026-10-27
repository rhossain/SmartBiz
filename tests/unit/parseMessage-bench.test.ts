/**
 * tests/unit/parseMessage-bench.test.ts — NFR6.7.1: p95 parseMessage ≤ 20 ms at 200 items.
 *
 * 200 generated lines (deterministic: colours, sizes and connectors in
 * rotation) parsed 200 times after a warm-up. The local budget is 20 ms;
 * under CI the gate fails at 10× (200 ms), per the B2 pipeline design.
 */
import { describe, expect, test } from "bun:test";
import { parseMessage } from "../../src/orders/parse-message.js";

const BUDGET_MS = 20;
const limitMs = process.env["CI"] ? BUDGET_MS * 10 : BUDGET_MS;

const COLOURS = ["কালো", "সাদা", "লাল", "নীল", "সবুজ", "হলুদ", "গোলাপি"];
const SIZES = ["S", "M", "L", "XL", "XXL"];
const JOIN = ["\n", " আর ", " এবং ", ", ", " তারপর "];

const message = Array.from(
  { length: 200 },
  (_, i) => `${COLOURS[i % 7]} কুর্তি ${SIZES[i % 5]} ${(i % 9) + 1}টা`,
).reduce((acc, line, i) => (i === 0 ? line : `${acc}${JOIN[i % 5]}${line}`), "");

describe("NFR6.7.1 — parseMessage micro-benchmark", () => {
  test(`p95 ≤ ${BUDGET_MS} ms for 200 items (CI gate ${limitMs} ms)`, () => {
    const warm = parseMessage(message);
    expect(warm.ok && warm.items.length).toBe(200);
    const samples: number[] = [];
    for (let i = 0; i < 200; i += 1) {
      const start = performance.now();
      parseMessage(message);
      samples.push(performance.now() - start);
    }
    samples.sort((a, b) => a - b);
    expect(samples[Math.floor((samples.length - 1) * 0.95)]!).toBeLessThanOrEqual(limitMs);
  });
});
