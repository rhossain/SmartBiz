/**
 * src/catalog/copy.ts — the catalog screens' words, Bangla first (U4 frontend-components
 * "Empty states", BR2.1, BR3.2, BR4.3, BR4.4, BR5.2, BR5.5, BR6.2, BR7.2, BR7.4, BR7.5, BR8.3,
 * BR9.3, BR9.4; NFR9.12; FR11.2).
 *
 * Kept beside the catalog rather than in the shared L table, as the order and daily-card
 * screens keep theirs, so U4 owns its strings; the shape is the same `L(bn, en)` pair and
 * the key type is closed, so a missing string is a type error, not a blank label. The
 * navigation labels, feature names and change-log action labels stay in src/i18n/L.ts,
 * because the router, the lock screen and the audit trail read them from there.
 */
import type { Locale } from "../data/enums.js";
import { bnDigits } from "../i18n/bnDigits.js";
import { L } from "../i18n/L.js";
import { intlCode } from "../i18n/locale.js";

const COPY = {
  // shared
  "cat.more": L("আরও দেখুন", "Show more"),
  "cat.new": L("+ নতুন", "+ New"),
  "cat.save": L("সংরক্ষণ", "Save"),
  "cat.edit": L("সম্পাদনা", "Edit"),
  "cat.clear_search": L("খোঁজ মুছুন", "Clear search"),
  "cat.total": L("মোট", "Total"),
  "cat.truncated": L("প্রথম ২০০টি দেখানো হচ্ছে", "Showing the first 200"),
  "cat.saved": L("সংরক্ষণ হয়েছে", "Saved"),
  "cat.back.customers": L("ক্রেতা তালিকায় ফিরুন", "Back to customers"),
  "cat.back.customer": L("ক্রেতায় ফিরুন", "Back to the customer"),
  "cat.back.products": L("পণ্য তালিকায় ফিরুন", "Back to products"),
  "cat.back.product": L("পণ্যে ফিরুন", "Back to the product"),
  // risk (BR3.2): the level labels live with RiskChip (src/pres/RiskChip.tsx)
  "risk.label": L("ঝুঁকি", "Risk"),
  // customers
  "customers.title": L("ক্রেতা", "Customers"),
  "customers.search": L("নাম বা নম্বর দিয়ে খুঁজুন", "Search by name or number"),
  "customers.digits_hint": L(
    "নম্বর দিয়ে খুঁজতে কমপক্ষে ৪টি সংখ্যা লিখুন",
    "Type at least 4 digits to search by number",
  ),
  "customers.empty": L("এখনো কোনো ক্রেতা নেই", "No customers yet"),
  "customers.empty_action": L("প্রথম ক্রেতা যোগ করুন", "Add the first customer"),
  "customers.no_match": L("এই নামে বা নম্বরে কেউ নেই", "Nobody matches"),
  "customers.col.name": L("নাম", "Name"),
  "customers.col.phone": L("মোবাইল", "Mobile"),
  "customer.field.name": L("নাম", "Name"),
  "customer.field.phone": L("মোবাইল নম্বর", "Mobile number"),
  "customer.field.address": L("ঠিকানা (ঐচ্ছিক)", "Address (optional)"),
  "customer.field.note": L("প্রথম নোট (ঐচ্ছিক)", "First note (optional)"),
  "customer.phone_invalid": L(
    "সঠিক মোবাইল নম্বর দিন (০১ দিয়ে শুরু, ১১ সংখ্যা)",
    "Enter a valid mobile number (starts with 01, 11 digits)",
  ),
  "customer.added": L("ক্রেতা যোগ হয়েছে", "Customer added"),
  "customer.duplicate": L("এই নম্বরে আগে থেকেই আছেন:", "Already saved with this number:"),
  "customer.new_order": L("নতুন অর্ডার", "New order"),
  "customer.address": L("ঠিকানা", "Address"),
  "customer.dues": L("লেনদেন ও বাকি", "Payments and dues"),
  "customer.dues_na": L("এখনো চালু হয়নি", "Not available yet"),
  "customer.notes": L("নোট", "Notes"),
  "customer.notes_empty": L("এখনো কোনো নোট নেই", "No notes yet"),
  "customer.note_add": L("+ নোট যোগ করুন", "+ Add a note"),
  "customer.note_text": L("নোট", "Note"),
  "customer.note_revise": L("সংশোধন", "Revise"),
  "customer.note_earlier": L("আগের নোট", "Earlier note"),
  "customer.note_conflict": L(
    "এই নোট আগেই সংশোধন হয়েছে — পাতাটি আবার খুলুন",
    "This note has already been revised — open the page again",
  ),
  "customer.notes_truncated": L(
    "সবচেয়ে নতুন ২০০টি নোট দেখানো হচ্ছে",
    "Showing the newest 200 notes",
  ),
  "customer.orders": L("অর্ডারের ইতিহাস", "Order history"),
  "customer.orders_empty": L(
    "এখনো অর্ডার নেই — এই ক্রেতা যোগ হয়েছেন কিন্তু কিছু কেনেননি",
    "No orders yet — this customer has not bought anything",
  ),
  "bucket.pipeline": L("চলমান", "pipeline"),
  "bucket.none": L("বিক্রি নয়", "no sale"),
  // products
  "products.title": L("পণ্য", "Products"),
  "products.search": L("নাম বা কোড দিয়ে খুঁজুন", "Search by name or code"),
  "products.empty": L("এখনো কোনো পণ্য নেই", "No products yet"),
  "products.empty_action": L("প্রথম পণ্য যোগ করুন", "Add the first product"),
  "products.no_match": L("এই নামে বা কোডে কোনো পণ্য নেই", "No product matches"),
  "products.col.name": L("নাম", "Name"),
  "products.col.sku": L("কোড", "Code"),
  "products.col.variants": L("ধরন", "Variants"),
  "products.col.stock": L("মোট মজুদ", "Total stock"),
  "products.col.low": L("কম মজুদ", "Low"),
  "product.field.name": L("নাম", "Name"),
  "product.field.sku": L("কোড (SKU)", "Code (SKU)"),
  "product.field.category": L("বিভাগ (ঐচ্ছিক)", "Category (optional)"),
  "product.field.price": L("বিক্রয়মূল্য (৳)", "Selling price (৳)"),
  "product.field.cost": L("ক্রয়মূল্য (৳, ঐচ্ছিক)", "Purchase cost (৳, optional)"),
  "product.field.supplier": L("সরবরাহকারী", "Supplier"),
  "product.price": L("বিক্রয়মূল্য", "Selling price"),
  "product.cost": L("ক্রয়মূল্য", "Purchase cost"),
  "product.category": L("বিভাগ", "Category"),
  "product.no_supplier": L("কেউ না", "None"),
  "product.axes": L("ধরনের ভাগ (যেমন সাইজ, রং)", "Variation (such as size, colour)"),
  "product.axis_name": L("ভাগের নাম", "Name of the variation"),
  "product.axis_values": L("মানগুলো, কমা দিয়ে আলাদা", "Values, separated by commas"),
  "product.add_axis": L("+ ভাগ যোগ করুন", "+ Add a variation"),
  "product.axis_limit": L("সর্বোচ্চ ২টি ভাগ", "At most 2 variations"),
  "product.remove_axis": L("বাদ দিন", "Remove"),
  "product.variants": L("ধরন", "Variants"),
  "product.single": L("একক", "Single"),
  "product.col.variant": L("ধরন", "Variant"),
  "product.col.sku": L("কোড", "Code"),
  "product.col.stock": L("মজুদ", "Stock"),
  "product.col.minimum": L("সর্বনিম্ন মজুদ", "Minimum stock"),
  "product.sku_taken": L("এই কোড আগেই ব্যবহার হয়েছে", "This code is already in use"),
  "product.added": L("পণ্য যোগ হয়েছে", "Product added"),
  "product.cost_not_recorded": L("দেওয়া হয়নি", "Not recorded"),
  "product.cost_change": L("বদলান", "Change"),
  "product.cost_new": L("নতুন ক্রয়মূল্য (৳)", "New purchase cost (৳)"),
  "product.stock_save": L("স্টক সংরক্ষণ", "Save stock"),
  "product.stock_failed": L("এই সারিগুলো সংরক্ষণ হয়নি:", "These rows were not saved:"),
  "product.supplier_missing": L("সরবরাহকারী দেওয়া নেই", "No supplier set"),
  "product.invalid_shape": L(
    "ধরনগুলো ঠিক নেই — প্রতিটি ভাগে ১–১২টি আলাদা মান দিন, '-' ছাড়া",
    "The variations are not valid — give each 1–12 different values, without '-'",
  ),
  // low stock (the mark's own words live with LowStockMark, src/pres/LowStockMark.tsx)
  "low.title": L("কম মজুদ", "Low stock"),
  "low.empty": L("সব ধরনের মজুদ ঠিক আছে", "All stock is fine"),
  "low.choose": L("বেছে নিন", "Choose one"),
  "low.col.product": L("পণ্য", "Product"),
  "low.col.variant": L("ধরন", "Variant"),
  "low.col.level": L("মজুদ / সর্বনিম্ন", "Stock / minimum"),
  "low.col.supplier": L("সরবরাহকারী", "Supplier"),
  // suppliers
  "suppliers.title": L("সরবরাহকারী", "Suppliers"),
  "suppliers.empty": L("এখনো কোনো সরবরাহকারী নেই", "No suppliers yet"),
  "suppliers.add": L("সরবরাহকারী যোগ করুন", "Add a supplier"),
  "suppliers.edit_title": L("সরবরাহকারী সম্পাদনা", "Edit supplier"),
  "suppliers.col.name": L("নাম", "Name"),
  "suppliers.col.phone": L("মোবাইল", "Mobile"),
  "suppliers.col.products": L("পণ্য", "Products"),
  "suppliers.field.name": L("নাম", "Name"),
  "suppliers.field.phone": L("মোবাইল নম্বর", "Mobile number"),
  "suppliers.added": L("সরবরাহকারী যোগ হয়েছে", "Supplier added"),
} as const;

export type CatalogKey = keyof typeof COPY;

export const tr = (key: CatalogKey, locale: Locale): string => COPY[key][locale];

/** A count, stock figure or phone in the reader's digits (BR2.2, BR5.6). */
export const digits = (value: number | string, locale: Locale): string =>
  locale === "bn" ? bnDigits(String(value)) : String(value);

/** Whole paise as taka with two decimals, in the reader's digits (BR5.6). */
export const taka = (paise: number, locale: Locale): string =>
  digits(`৳${(paise / 100).toFixed(2)}`, locale);

/** An ISO time as a local date and time, in the reader's digits (BR5.6). */
export const shownDate = (iso: string, locale: Locale): string =>
  digits(
    new Date(iso).toLocaleString(intlCode(locale), {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      numberingSystem: "latn",
    }),
    locale,
  );
