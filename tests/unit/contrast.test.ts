/**
 * tests/unit/contrast.test.ts — NFR4.1.
 * Every design token's foreground+background pair meets WCAG AA
 * (4.5:1 normal, 3:1 large).
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const pairs: Array<{ fg: string; bg: string; minRatio: number; label: string }> = [
  { fg: "#111a16", bg: "#ffffff", minRatio: 4.5, label: "text on bg" },
  { fg: "#0b6e52", bg: "#ffffff", minRatio: 4.5, label: "link on bg" },
  { fg: "#a4252b", bg: "#ffffff", minRatio: 4.5, label: "error on bg" },
  { fg: "#1f6f3d", bg: "#ffffff", minRatio: 4.5, label: "success on bg" },
  { fg: "#6b6b6b", bg: "#ffffff", minRatio: 3.0, label: "border on bg" },
  { fg: "#ffffff", bg: "#111a16", minRatio: 4.5, label: "on-dark text on dark bg" },
  { fg: "#ffffff", bg: "#0b6e52", minRatio: 4.5, label: "on-primary on brand" },
  { fg: "#ffffff", bg: "#a4252b", minRatio: 4.5, label: "on-error on error" },
  // U2 (N-02, NFR9.9): the pairs the component rules use (components.css).
  { fg: "#a4252b", bg: "#fbeaea", minRatio: 4.5, label: "error banner text on bg-error" },
  { fg: "#111a16", bg: "#fbeaea", minRatio: 4.5, label: "text on bg-error" },
  { fg: "#1f6f3d", bg: "#eef0ec", minRatio: 4.5, label: "success on bg-muted" },
  { fg: "#111a16", bg: "#eef0ec", minRatio: 4.5, label: "lock text on bg-muted" },
  { fg: "#0b6e52", bg: "#eef0ec", minRatio: 4.5, label: "link on bg-muted" },
  { fg: "#0b6e52", bg: "#ffffff", minRatio: 3.0, label: "focus outline on bg (non-text 3:1)" },
  // The brand surface (tokens.css, redesign v2 §19): every text pair components.css uses.
  { fg: "#111a16", bg: "#f5f6f3", minRatio: 4.5, label: "text on canvas" },
  { fg: "#0b6e52", bg: "#f5f6f3", minRatio: 4.5, label: "link on canvas" },
  { fg: "#4a5550", bg: "#ffffff", minRatio: 4.5, label: "text-2 on surface" },
  { fg: "#4a5550", bg: "#f5f6f3", minRatio: 4.5, label: "text-2 on canvas" },
  { fg: "#4a5550", bg: "#f9faf8", minRatio: 4.5, label: "text-2 on surface-2" },
  { fg: "#111a16", bg: "#f9faf8", minRatio: 4.5, label: "text on surface-2" },
  { fg: "#626d68", bg: "#ffffff", minRatio: 4.5, label: "caption text-3 on surface" },
  { fg: "#626d68", bg: "#f5f6f3", minRatio: 4.5, label: "caption text-3 on canvas" },
  { fg: "#eaf0ed", bg: "#0c1613", minRatio: 4.5, label: "sidebar text on sidebar" },
  { fg: "#9db0a8", bg: "#0c1613", minRatio: 4.5, label: "sidebar muted on sidebar" },
  { fg: "#9db0a8", bg: "#16241f", minRatio: 4.5, label: "sidebar muted on active row" },
  { fg: "#eaf0ed", bg: "#16241f", minRatio: 4.5, label: "sidebar text on active row" },
  { fg: "#0c1613", bg: "#d6b36a", minRatio: 4.5, label: "ink on gold brand mark" },
  { fg: "#8a6420", bg: "#ffffff", minRatio: 4.5, label: "gold accent text on surface" },
  { fg: "#ffffff", bg: "#085a43", minRatio: 4.5, label: "button text on brand hover" },
  { fg: "#ffffff", bg: "#06382a", minRatio: 4.5, label: "hero figure on deep brand" },
  { fg: "#cfe9dd", bg: "#06382a", minRatio: 4.5, label: "hero tile muted text" },
  { fg: "#cfe9dd", bg: "#0b6e52", minRatio: 4.5, label: "hero tile muted text, gradient end" },
  { fg: "#0b6e52", bg: "#e4f2eb", minRatio: 4.5, label: "success pill" },
  { fg: "#9a5f0c", bg: "#fbefd9", minRatio: 4.5, label: "warning pill" },
  { fg: "#4a5550", bg: "#eef0ec", minRatio: 4.5, label: "neutral pill" },
  { fg: "#a4252b", bg: "#fbeaea", minRatio: 4.5, label: "danger pill" },
  // --color-line is a decorative hairline (no contrast floor); text placed on it still reads.
  { fg: "#111a16", bg: "#e5e8e4", minRatio: 4.5, label: "text on line tint" },
  {
    fg: "#8a938f",
    bg: "#ffffff",
    minRatio: 3.0,
    label: "control border on surface (non-text 3:1)",
  },
  { fg: "#0b6e52", bg: "#eff7f3", minRatio: 4.5, label: "brand text on brand tint" },
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
