/**
 * src/daily-card/copy.ts — bilingual copy for the daily card (US3.1, CC-AC-I18N; mockups §17.1).
 */
import type { Locale } from "../data/enums.js";
import { L } from "../i18n/L.js";

const COPY = {
  // Same words as the nav link, so the screen and the menu name it alike.
  "daily.title": L("দৈনিক কার্ড", "Daily card"),
  "daily.refresh": L("রিফ্রেশ", "Refresh"),
  "daily.refreshed": L("হালনাগাদ হয়েছে", "Updated"),
  "daily.updated_at": L("সর্বশেষ হালনাগাদ", "Last updated"),
  "daily.orders": L("আজকের অর্ডার", "Today's orders"),
  "daily.orders_note": L(
    "টি অর্ডার, বাতিল ও ফেরত বাদে মূল্য",
    " orders; value excludes cancelled and returned",
  ),
  "daily.income": L("আজকের আয় (হাতে এসেছে)", "Today's income (realized)"),
  "daily.income_note": L(
    "আজ তৈরি অর্ডারের মধ্যে টাকা পাওয়া গেছে এমন",
    "From orders created today that are settled",
  ),
  "daily.dues": L("বকেয়া", "Dues"),
  "daily.expenses": L("আজকের খরচ", "Today's expenses"),
  "daily.not_recorded": L("এখনো রেকর্ড শুরু হয়নি", "Not recorded yet"),
  "daily.by_status": L("আজকের অর্ডার, অবস্থা অনুযায়ী", "Today's orders by status"),
  "daily.none_today": L("আজ এখনো কোনো অর্ডার নেই", "No orders yet today"),
  "daily.all_orders": L("সব অর্ডার দেখুন →", "See all orders →"),
  "daily.loading": L("লোড হচ্ছে", "Loading"),
  "daily.error": L("আজকের তথ্য আনা যায়নি", "Today's figures could not be loaded"),
  "daily.retry": L("আবার চেষ্টা করুন", "Try again"),
} as const;

export type DailyKey = keyof typeof COPY;

export const tr = (key: DailyKey, locale: Locale): string => COPY[key][locale];
