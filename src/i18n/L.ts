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
  // U2 (frontend-components "Nav"): the design's label for the daily card.
  "nav.daily_card": L("দৈনিক কার্ড", "Daily card"),
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
  // U2 (BR4.1, BR1.1; frontend-components): the way home from the lock and placeholder screens.
  "common.go_home": L("হোমে যান", "Go home"),
  "common.saved": L("সংরক্ষণ হয়েছে", "Saved"),
  "common.retry": L("আবার চেষ্টা করুন", "Try again"),
  // U2 (R10, NFR7.13): the conflict view's action.
  "common.reload": L("আবার লোড করুন", "Reload"),
  "not_available.message": L("এই অংশ পরের সংস্করণে আসবে", "This part arrives in a later release"),
  // U2: each screen route's feature name (ScreenRoute.feature; lock and not-available screens).
  "feature.home": L("হোম", "Home"),
  "feature.sign_in": L("সাইন ইন", "Sign in"),
  "feature.sign_up": L("সাইন আপ", "Sign up"),
  "feature.accept_invite": L("আমন্ত্রণ গ্রহণ", "Accept invitation"),
  "feature.reset": L("নতুন পাসওয়ার্ড", "New password"),
  "feature.recover": L("পাসওয়ার্ড পুনরুদ্ধার", "Recover password"),
  "feature.lock": L("অ্যাক্সেস সীমাবদ্ধ", "Access restricted"),
  "feature.not_found": L("পাওয়া যায়নি", "Not found"),
  "feature.orders": L("অর্ডার", "Orders"),
  "feature.order_new": L("নতুন অর্ডার", "New order"),
  "feature.order_paste": L("মেসেজ থেকে অর্ডার", "Order from a message"),
  "feature.order_repeat": L("আগের অর্ডার আবার", "Repeat a past order"),
  "feature.order_transition": L("অর্ডারের অবস্থা বদল", "Change an order's status"),
  "feature.daily_card": L("দৈনিক কার্ড", "Daily card"),
  "feature.audit_trail": L("অডিট ট্রেইল", "Audit trail"),
  "feature.business": L("ব্যবসা", "Business"),
  "feature.settings": L("সেটিংস", "Settings"),
  // U2 audit trail screen (W4; O10).
  "audit.empty": L("এখনো কোনো এন্ট্রি নেই", "No entries yet"),
  "audit.more": L("আরও দেখুন", "Show more"),
  "audit.system": L("সিস্টেম", "System"),
  "audit.col.action": L("কাজ", "Action"),
  "audit.col.time": L("সময়", "Time"),
  "audit.col.actor": L("কে করেছেন", "By"),
  "audit.col.subject": L("বিষয়", "Subject"),
  "audit.col.correlation": L("সংযোগ আইডি", "Correlation id"),
  "audit.action.order.create": L("অর্ডার তৈরি", "Order created"),
  "audit.action.order.update": L("অর্ডার বদল", "Order changed"),
  "audit.action.order.status.transition": L("অর্ডারের অবস্থা বদল", "Order status changed"),
  "audit.action.order.consignment.link": L("কনসাইনমেন্ট যুক্ত", "Consignment linked"),
  "audit.action.auth.sign_up": L("ব্যবসা তৈরি", "Business created"),
  "audit.action.auth.sign_in": L("সাইন ইন", "Signed in"),
  "audit.action.auth.sign_in.failure": L("সাইন ইন ব্যর্থ", "Sign-in failed"),
  "audit.action.auth.sign_out": L("সাইন আউট", "Signed out"),
});

/** True when the table has a row for `key` (labels that may be missing, e.g. audit actions). */
export const hasKey = (key: string): boolean => Object.hasOwn(L_TABLE, key);

export type LKey = keyof typeof L_TABLE;

export const lookup = (key: LKey, locale: Locale): string => {
  const t = L_TABLE[key];
  if (!t) throw new Error(`missing L key: ${String(key)}`);
  return locale === "bn" ? t.bn : t.en;
};
