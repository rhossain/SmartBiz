/**
 * tests/unit/contrast.test.ts — NFR4.1.
 * Every design token's foreground+background pair meets WCAG AA
 * (4.5:1 normal, 3:1 large).
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const pairs: Array<{ fg: string; bg: string; minRatio: number; label: string }> = [
  { fg: "#1a1a1a", bg: "#ffffff", minRatio: 4.5, label: "text on bg" },
  { fg: "#1457b2", bg: "#ffffff", minRatio: 4.5, label: "link on bg" },
  { fg: "#a4252b", bg: "#ffffff", minRatio: 4.5, label: "error on bg" },
  { fg: "#1f6f3d", bg: "#ffffff", minRatio: 4.5, label: "success on bg" },
  { fg: "#6b6b6b", bg: "#ffffff", minRatio: 3.0, label: "border on bg" },
  { fg: "#ffffff", bg: "#1a1a1a", minRatio: 4.5, label: "on-dark text on dark bg" },
  { fg: "#ffffff", bg: "#1457b2", minRatio: 4.5, label: "on-primary on link" },
  { fg: "#ffffff", bg: "#a4252b", minRatio: 4.5, label: "on-error on error" },
  // U2 (N-02, NFR9.9): the pairs the new component rules use (components.css).
  { fg: "#a4252b", bg: "#fbeaea", minRatio: 4.5, label: "error banner text on bg-error" },
  { fg: "#1a1a1a", bg: "#fbeaea", minRatio: 4.5, label: "text on bg-error" },
  { fg: "#1f6f3d", bg: "#f5f5f5", minRatio: 4.5, label: "shell toast success on bg-muted" },
  { fg: "#1a1a1a", bg: "#f5f5f5", minRatio: 4.5, label: "lock text on bg-muted" },
  { fg: "#1457b2", bg: "#f5f5f5", minRatio: 4.5, label: "link on bg-muted" },
  { fg: "#1457b2", bg: "#ffffff", minRatio: 3.0, label: "focus outline on bg (non-text 3:1)" },
];

const channel = (hex2: string): number => {
  const v = parseInt(hex2, 16);
  return Number.isNaN(v) ? 0 : v;
};

const srgbToLinear = (c: number): number => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
};

const relativeLuminance = (hex: string): number => {
  const r = channel(hex.slice(1, 3));
  const g = channel(hex.slice(3, 5));
  const b = channel(hex.slice(5, 7));
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
};

const contrastRatio = (a: string, b: string): number => {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
};

describe("NFR4.1 — design tokens meet WCAG AA", () => {
  for (const p of pairs) {
    test(`${p.label}: ${p.fg} on ${p.bg} ≥ ${p.minRatio}:1`, () => {
      const r = contrastRatio(p.fg, p.bg);
      expect(r).toBeGreaterThanOrEqual(p.minRatio);
    });
  }

  // U2 (N-02): a colour token added to tokens.css without a checked pair fails here.
  test("every colour token in tokens.css is in at least one checked pair", () => {
    const css = readFileSync(join(import.meta.dir, "../../src/pres/tokens.css"), "utf8");
    const tokens = [...css.matchAll(/--color-[\w-]+:\s*(#[0-9a-f]{6})\b/gi)].map((m) =>
      (m[1] ?? "").toLowerCase(),
    );
    expect(tokens.length).toBeGreaterThanOrEqual(11);
    const covered = new Set(pairs.flatMap((p) => [p.fg.toLowerCase(), p.bg.toLowerCase()]));
    expect(tokens.filter((t) => !covered.has(t))).toEqual([]);
  });
});
