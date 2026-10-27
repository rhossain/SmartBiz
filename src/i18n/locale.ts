/**
 * src/i18n/locale.ts — the Intl code for each Locale (the Locale union itself lives in
 * src/data/enums.ts, domain-design follow-up R-01).
 */
import type { Locale } from "../data/enums.js";

export const intlCode = (l: Locale): "bn-BD" | "en-GB" => (l === "bn" ? "bn-BD" : "en-GB");
