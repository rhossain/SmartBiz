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
  "auth.sign_out.title": L("সাইন আউট", "Sign out"),
  "auth.email": L("ইমেইল", "Email"),
  "auth.password": L("পাসওয়ার্ড", "Password"),
  "auth.business_name": L("ব্যবসার নাম", "Business name"),
  "auth.sign_in.submit": L("সাইন ইন করুন", "Sign in"),
  "auth.sign_up.submit": L("ব্যবসা তৈরি করুন", "Create the business"),
  "auth.go_sign_in": L("সাইন ইন পাতায় যান", "Go to sign in"),
  "auth.working": L("অপেক্ষা করুন…", "Please wait…"),
  "nav.orders": L("অর্ডার", "Orders"),
  "nav.daily_card": L("দৈনিক হিসাব", "Daily card"),
  "nav.audit_trail": L("অডিট ট্রেইল", "Audit trail"),
  "nav.business": L("ব্যবসা", "Business"),
  "nav.settings": L("সেটিংস", "Settings"),
  "nav.language": L("ভাষা", "Language"),
  "role.owner": L("মালিক", "Owner"),
  "role.manager": L("ম্যানেজার", "Manager"),
  "role.sales_staff": L("বিক্রয়কর্মী", "Sales staff"),
  "role.accountant": L("হিসাবরক্ষক", "Accountant"),
  "common.save": L("সংরক্ষণ", "Save"),
  "common.cancel": L("বাতিল", "Cancel"),
  "common.loading": L("লোড হচ্ছে…", "Loading…"),
  "common.error": L("ত্রুটি", "Error"),
  "lock.title": L("অ্যাক্সেস সীমাবদ্ধ", "Access restricted"),
  // U1 error catalogue `forbidden`: the lock screen's own words.
  "lock.message": L("এই অংশ আপনার দায়িত্বের বাইরে", "This is outside your role"),
});

export type LKey = keyof typeof L_TABLE;

export const lookup = (key: LKey, locale: Locale): string => {
  const t = L_TABLE[key];
  if (!t) throw new Error(`missing L key: ${String(key)}`);
  return locale === "bn" ? t.bn : t.en;
};
