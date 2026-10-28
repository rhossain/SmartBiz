/**
 * src/orders/screens/copy.ts — the U3 screen copy, bilingual (FR11.2).
 *
 * Kept beside the screens rather than in the B1 L_TABLE so U3 owns its
 * strings; the shape is the same `L(bn, en)` pair, and the key type is
 * closed, so a missing string is a type error, not a blank label.
 */
import type { Locale } from "../../data/enums.js";
import { L } from "../../i18n/L.js";

const COPY = {
  "orders.title": L("অর্ডার", "Orders"),
  // The back link on every orders sub-screen (detail, new, from a message, repeat).
  "orders.back": L("অর্ডারে ফিরুন", "Back to orders"),
  "orders.empty": L("এখনো কোনো অর্ডার নেই", "No orders yet"),
  "orders.new": L("নতুন অর্ডার", "New order"),
  "orders.paste": L("মেসেজ থেকে", "From a message"),
  "orders.repeat": L("আগের অর্ডার থেকে", "Repeat a past order"),
  "orders.filter.status": L("অবস্থা", "Status"),
  "orders.filter.all": L("সব", "All"),
  "orders.filter.customer": L("কাস্টমার আইডি", "Customer id"),
  "orders.filter.from": L("শুরুর তারিখ", "From date"),
  "orders.filter.to": L("শেষ তারিখ", "To date"),
  "orders.filter.apply": L("ছাঁকুন", "Filter"),
  "orders.more": L("আরও দেখুন", "Load more"),
  "orders.open": L("খুলুন", "Open"),
  "orders.earned": L("আয় (অর্জিত)", "Earned"),
  "orders.realized": L("হাতে এসেছে", "Realized"),
  "orders.pipeline": L("চলমান", "In pipeline"),
  "orders.total": L("মোট", "Total"),
  "orders.source": L("উৎস", "Source"),
  "orders.quick.title": L("দ্রুত অর্ডার", "Quick add"),
  "orders.quick.description": L("পণ্য", "Item"),
  "orders.quick.quantity": L("পরিমাণ", "Quantity"),
  "orders.quick.price": L("দাম (৳)", "Price (৳)"),
  "orders.quick.delivery": L("ডেলিভারি চার্জ (৳)", "Delivery charge (৳)"),
  "orders.save": L("সংরক্ষণ", "Save"),
  "orders.saved": L("সংরক্ষণ হয়েছে", "Saved"),
  "orders.invalid": L("তথ্য ঠিক নেই", "Some details are not valid"),
  "orders.save_failed": L("সংরক্ষণ হয়নি, আবার চেষ্টা করুন", "Could not save, please try again"),
  "detail.items": L("পণ্যসমূহ", "Items"),
  "detail.discount": L("ছাড়", "Discount"),
  "detail.delivery": L("ডেলিভারি চার্জ", "Delivery charge"),
  "detail.contact": L("যোগাযোগ", "Contact"),
  "detail.move_to": L("অবস্থা বদলান", "Move to"),
  "detail.repeat": L("আবার অর্ডার করুন", "Repeat order"),
  "paste.title": L("মেসেজ থেকে অর্ডার", "Order from a message"),
  "paste.box": L("মেসেজ", "The message"),
  "paste.parse": L("পড়ুন", "Read message"),
  "paste.incomplete": L("বিস্তারিত বেছে নিন", "Pick the details"),
  "paste.empty": L("মেসেজটি খালি", "The message is empty"),
  "paste.malformed": L("কোনো পণ্য পাওয়া যায়নি", "No item found in the message"),
  "paste.too_large": L("২০০টির বেশি পণ্য — ভাগ করে দিন", "More than 200 items — split the message"),
  "paste.cod": L("ক্যাশ অন ডেলিভারি", "Cash on delivery"),
  "paste.size": L("সাইজ", "Size"),
  "paste.colour": L("রং", "Colour"),
  "paste.unattached": L("এই বিবরণ কোনো পণ্যের সাথে মেলেনি", "These details matched no item"),
  "manual.title": L("নতুন অর্ডার", "New order"),
  "manual.line": L("লাইন", "Line"),
  "manual.variant": L("ভ্যারিয়েন্ট (ঐচ্ছিক)", "Variant (optional)"),
  "manual.line_discount": L("লাইনের ছাড় (৳)", "Line discount (৳)"),
  "manual.order_discount": L("অর্ডারের ছাড় (৳)", "Order discount (৳)"),
  "manual.add_line": L("লাইন যোগ করুন", "Add line"),
  "manual.remove_line": L("লাইন সরান", "Remove line"),
  "manual.line_invalid": L(
    "পণ্য, পরিমাণ ও দাম ঠিকভাবে লিখুন",
    "Enter an item, a quantity and a price",
  ),
  "manual.line_total": L("লাইনের মোট", "Line total"),
  "repeat.title": L("আগের অর্ডার আবার", "Repeat a past order"),
  "repeat.pick": L("বেছে নিন", "Pick"),
  "repeat.none": L("আগের কোনো অর্ডার নেই", "No past orders"),
} as const;

export type CopyKey = keyof typeof COPY;

export const tr = (key: CopyKey, locale: Locale): string =>
  locale === "bn" ? COPY[key].bn : COPY[key].en;
