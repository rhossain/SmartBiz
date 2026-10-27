/**
 * src/i18n/locale.ts — Locale type + Intl code mapping.
 */
import type { Locale } from "../auth/types.js";

export type { Locale };

export const intlCode = (l: Locale): "bn-BD" | "en-GB" => (l === "bn" ? "bn-BD" : "en-GB");
