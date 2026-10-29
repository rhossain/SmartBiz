/**
 * tests/unit/parseMessage-bench.test.ts — NFR6.7.1: p95 parseMessage ≤ 20 ms at 200 items.
 *
 * 200 generated lines (deterministic: colours, sizes and connectors in
 * rotation) parsed 200 times after a warm-up. The local budget is 20 ms;
 * under CI the gate fails at 10× (200 ms), per the B2 pipeline design.
 */
import { describe, expect, test } from "bun:test";
import { parseMessage } from "../../src/orders/parse-message.js";
import { prepareCatalog } from "../../src/orders/parse-message-segments.js";

const BUDGET_MS = 20;
const limitMs = process.env["CI"] ? BUDGET_MS * 10 : BUDGET_MS;

const COLOURS = ["কালো", "সাদা", "লাল", "নীল", "সবুজ", "হলুদ", "গোলাপি"];
const SIZES = ["S", "M", "L", "XL", "XXL"];
const JOIN = ["\n", " আর ", " এবং ", ", ", " তারপর "];

const message = Array.from(
  { length: 200 },
  (_, i) => `${COLOURS[i % 7]} কুর্তি ${SIZES[i % 5]} ${(i % 9) + 1}টা`,
).reduce((acc, line, i) => (i === 0 ? line : `${acc}${JOIN[i % 5]}${line}`), "");

const p95 = (run: () => void): number => {
  const samples: number[] = [];
  for (let i = 0; i < 200; i += 1) {
    const start = performance.now();
    run();
    samples.push(performance.now() - start);
  }
  samples.sort((a, b) => a - b);
  return samples[Math.floor((samples.length - 1) * 0.95)]!;
};

/*
 * U5 (NFR6.36, P27): the same 200 items against a 6 000-variant match index — 500 products
 * of 12 variants (3 sizes × 4 colours), prepared ONCE as the paste screen does. Each item
 * names one product by its whole name, so every item is linked and its variant picked.
 */
const INDEX_COLOURS = ["কালো", "সাদা", "লাল", "নীল"];
const INDEX_SIZES = ["M", "L", "XL"];
const productName = (n: number): string => `কুর্তি মডেল ${String(n).padStart(3, "0")}`;
const index = {
  products: Array.from({ length: 500 }, (_, n) => ({
    productId: `P${n}`,
    name: productName(n),
    sku: `KRT-${n}`,
    axisNames: ["সাইজ", "রং"],
    variants: INDEX_SIZES.flatMap((s) =>
      INDEX_COLOURS.map((c) => ({ variantId: `P${n}-${s}-${c}`, axisValues: [s, c] })),
    ),
  })),
};
const catalogMessage = Array.from(
  { length: 200 },
  (_, i) =>
    `${INDEX_COLOURS[i % 4]} ${productName((i * 7) % 500)} ${INDEX_SIZES[i % 3]} ${(i % 9) + 1}টা`,
).reduce((acc, line, i) => (i === 0 ? line : `${acc}${JOIN[i % 5]}${line}`), "");

describe("NFR6.7.1 — parseMessage micro-benchmark", () => {
  test(`p95 ≤ ${BUDGET_MS} ms for 200 items (CI gate ${limitMs} ms)`, () => {
    const warm = parseMessage(message);
    expect(warm.ok && warm.items.length).toBe(200);
    expect(p95(() => parseMessage(message))).toBeLessThanOrEqual(limitMs);
  });

  test(`NFR6.36: p95 ≤ ${BUDGET_MS} ms for 200 items against a 6 000-variant index`, () => {
    const catalog = prepareCatalog(index);
    expect(catalog.reduce((n, p) => n + p.variants.length, 0)).toBe(6_000);
    const warm = parseMessage(catalogMessage, catalog);
    expect(warm.ok && warm.items.length).toBe(200);
    expect(warm.ok && warm.items.every((i) => i.variantId !== null)).toBe(true);
    expect(p95(() => parseMessage(catalogMessage, catalog))).toBeLessThanOrEqual(limitMs);
  });
});
