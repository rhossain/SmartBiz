/**
 * src/i18n/L.ts — the L(bn, en) macro + the frozen L table.
 *
 * The macro returns a `Translation`; the table freezes the
 * strings that the application emits. Adding a new key requires
 * adding a row to L_TABLE; missing-key assertions are surfaced
 * as TypeScript errors via the `keyof L_TABLE` constraint.
 */
import type { Locale } from "../data/enums.js";
import type { Translation, Translations } from "./types.js";

export const L = (bn: string, en: string): Translation => ({ bn, en });

export const L_TABLE: Translations = Object.freeze({
  "auth.sign_in.title": L("সাইন ইন", "Sign in"),
  "auth.sign_up.title": L("সাইন আপ", "Sign up"),
  "auth.recover.title": L("পাসওয়ার্ড পুনরুদ্ধার", "Recover password"),
  "auth.reset.title": L("নতুন পাসওয়ার্ড", "New password"),
  "auth.accept.title": L("আমন্ত্রণ গ্রহণ", "Accept invitation"),
  "common.save": L("সংরক্ষণ", "Save"),
  "common.cancel": L("বাতিল", "Cancel"),
  "common.loading": L("লোড হচ্ছে…", "Loading…"),
  "common.error": L("ত্রুটি", "Error"),
  "lock.title": L("অ্যাক্সেস সীমাবদ্ধ", "Access restricted"),
  "lock.message": L(
    "এই পৃষ্ঠা আপনার ভূমিকার জন্য উপলব্ধ নয়।",
    "This page is not available for your role.",
  ),
});

export type LKey = keyof typeof L_TABLE;

export const lookup = (key: LKey, locale: Locale): string => {
  const t = L_TABLE[key];
  if (!t) throw new Error(`missing L key: ${String(key)}`);
  return locale === "bn" ? t.bn : t.en;
};
