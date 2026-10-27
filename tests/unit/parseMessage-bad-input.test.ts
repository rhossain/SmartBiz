/**
 * tests/unit/parseMessage-bad-input.test.ts — NFR6.7.4: parseMessage never throws.
 *
 * Every bad input comes back as a typed reason: `empty`, `malformed`
 * (not a string, or no item), `too_large` (more than 200 items, or an
 * oversized message). A seeded fuzz run feeds 1 000 hostile strings
 * (regex metacharacters, control characters, emoji, mixed scripts) and
 * asserts each one returns a ParseResult instead of throwing.
 */
import { describe, expect, test } from "bun:test";
import { parseMessage } from "../../src/orders/parse-message.js";

const lines = (n: number): string =>
  Array.from({ length: n }, (_, i) => `লাল শাড়ি ${i + 1}টা`).join("\n");

describe("NFR6.7.4 — parseMessage bad input", () => {
  test("empty and whitespace-only text is `empty`", () => {
    expect(parseMessage("")).toEqual({ ok: false, reason: "empty" });
    expect(parseMessage("   \n\t \n")).toEqual({ ok: false, reason: "empty" });
  });

  test("a non-string is `malformed`", () => {
    for (const bad of [null, undefined, 42, {}, [], true]) {
      expect(parseMessage(bad)).toEqual({ ok: false, reason: "malformed" });
    }
  });

  test("text with no recognisable item is `malformed`", () => {
    expect(parseMessage("হ্যালো আপা, কেমন আছেন?")).toEqual({ ok: false, reason: "malformed" });
    expect(parseMessage("01711234567\nউত্তরা, ঢাকা")).toEqual({ ok: false, reason: "malformed" });
  });

  test("201 items is `too_large`; exactly 200 parses", () => {
    expect(parseMessage(lines(201))).toEqual({ ok: false, reason: "too_large" });
    const r = parseMessage(lines(200));
    expect(r.ok && r.items.length).toBe(200);
  });

  test("a message over the character ceiling is `too_large` before any work", () => {
    expect(parseMessage("ক".repeat(40_001))).toEqual({ ok: false, reason: "too_large" });
  });

  test("1 000 seeded hostile strings never throw", () => {
    // Deterministic LCG so the run is identical every time (team.md §TP-11).
    let seed = 20260907;
    const next = (): number => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed;
    };
    const alphabet = [
      ..."()[]{}*+?.^$|\\/,;+·।\n\r\t\u0000‍😀আরএবংওটাটিপিস0123456789০১২৩৪৫৬৭৮৯MLXS",
    ];
    for (let i = 0; i < 1000; i += 1) {
      const len = next() % 120;
      let s = "";
      for (let j = 0; j < len; j += 1) s += alphabet[next() % alphabet.length];
      let threw = false;
      let result: unknown;
      try {
        result = parseMessage(s);
      } catch {
        threw = true;
      }
      expect({ input: s, threw }).toEqual({ input: s, threw: false });
      expect(typeof (result as { ok: unknown }).ok).toBe("boolean");
    }
  });
});
