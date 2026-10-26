/**
 * src/pres/typography.ts — font + Intl.NumberFormat cache.
 * The Intl.NumberFormat is cached by locale so the B1 perf budget
 * (NFR2.3: L(bn, en) resolve ≤ 5 ms p95) holds.
 */
import { intlCode, type Locale } from "../i18n/locale.js";

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

export const NOTO_SANS_BENGALI_HREF =
  "https://fonts.gstatic.com/s/notosansbengali/v20/Cn-jJsyaWQNOOFlYRqp7eA8UZjMOMyUwHNdCl9QQdj9.css";