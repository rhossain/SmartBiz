/**
 * src/i18n/types.ts — Translation entry type.
 */
import type { Locale } from "../auth/types.js";

export interface Translation {
  readonly bn: string;
  readonly en: string;
}

export type Translations = Record<string, Translation>;

export const translate = (t: Translation, locale: Locale): string =>
  locale === "bn" ? t.bn : t.en;