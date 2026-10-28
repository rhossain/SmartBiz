/**
 * src/pres/typography.ts — Intl.NumberFormat cache.
 * The Intl.NumberFormat is cached by locale so the B1 perf budget
 * (NFR2.3: L(bn, en) resolve ≤ 5 ms p95) holds. U1 removed the hosted
 * font link: the CSP allows only 'self', and the Bengali font comes from
 * the local fallback chain in tokens.css (team.md Code Style).
 */
import type { Locale } from "../data/enums.js";
import { intlCode } from "../i18n/locale.js";

const cache = new Map<Locale, Intl.NumberFormat>();

export const getNumberFormatter = (locale: Locale): Intl.NumberFormat => {
  const cached = cache.get(locale);
  if (cached) return cached;
  const nf = new Intl.NumberFormat(intlCode(locale), {
    style: "decimal",
    maximumFractionDigits: 2,
  });
  cache.set(locale, nf);
  return nf;
};

export const formatPaise = (paise: number, locale: Locale): string => {
  return getNumberFormatter(locale).format(paise / 100);
};
