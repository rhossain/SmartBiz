/**
 * tests/unit/contrast.test.ts — NFR4.1.
 * Every design token's foreground+background pair meets WCAG AA
 * (4.5:1 normal, 3:1 large).
 */
import { describe, expect, test } from "bun:test";

const pairs: Array<{ fg: string; bg: string; minRatio: number; label: string }> = [
  { fg: "#1a1a1a", bg: "#ffffff", minRatio: 4.5, label: "text on bg" },
  { fg: "#1457b2", bg: "#ffffff", minRatio: 4.5, label: "link on bg" },
  { fg: "#a4252b", bg: "#ffffff", minRatio: 4.5, label: "error on bg" },
  { fg: "#1f6f3d", bg: "#ffffff", minRatio: 4.5, label: "success on bg" },
  { fg: "#6b6b6b", bg: "#ffffff", minRatio: 3.0, label: "border on bg" },
  { fg: "#ffffff", bg: "#1a1a1a", minRatio: 4.5, label: "on-dark text on dark bg" },
  { fg: "#ffffff", bg: "#1457b2", minRatio: 4.5, label: "on-primary on link" },
  { fg: "#ffffff", bg: "#a4252b", minRatio: 4.5, label: "on-error on error" },
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
});
