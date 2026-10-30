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
  "nav.insights": L("বিশ্লেষণ", "Insights"),
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
  // U2 (NFR9.9, G-01): the visible label of each toast tone.
  "toast.info": L("তথ্য", "Info"),
  "toast.warn": L("সতর্কতা", "Warning"),
  "toast.success": L("সফল", "Done"),
  "toast.error": L("ত্রুটি", "Error"),
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
  "feature.insights": L("বিশ্লেষণ", "Insights"),
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
  // U3 (O15; NFR8.16): the four staff actions and the terminal as an actor.
  "audit.action.auth.invite_created": L("আমন্ত্রণ তৈরি", "Invitation created"),
  "audit.action.auth.invite_accepted": L("আমন্ত্রণ গ্রহণ", "Invitation accepted"),
  "audit.action.auth.reset_link_created": L("রিসেট লিংক তৈরি", "Reset link created"),
  "audit.action.auth.password_reset": L("পাসওয়ার্ড রিসেট", "Password reset"),
  "audit.terminal": L("টার্মিনাল", "Terminal"),
  // U3 staff screen (frontend-components; BR9.1, BR9.2).
  "nav.staff": L("কর্মী", "Staff"),
  "feature.staff": L("কর্মী", "Staff"),
  "staff.members": L("সদস্য", "Members"),
  "staff.invitations": L("অপেক্ষমাণ আমন্ত্রণ", "Pending invitations"),
  "staff.no_invitations": L("কোনো অপেক্ষমাণ আমন্ত্রণ নেই", "No pending invitations"),
  "staff.col.email": L("ইমেইল", "Email"),
  "staff.col.role": L("ভূমিকা", "Role"),
  "staff.col.active": L("অবস্থা", "Status"),
  "staff.col.expires": L("মেয়াদ শেষ", "Expires"),
  "staff.active": L("সক্রিয়", "Active"),
  "staff.inactive": L("নিষ্ক্রিয়", "Inactive"),
  "staff.invite.title": L("নতুন কর্মী আমন্ত্রণ", "Invite a staff member"),
  "staff.invite.submit": L("আমন্ত্রণ লিংক তৈরি করুন", "Create an invitation link"),
  "staff.invite.exists": L("এই ইমেইল আগে থেকেই আছে", "This email is already a member"),
  "staff.reset_link": L("রিসেট লিংক", "Reset link"),
  "staff.truncated": L("প্রথম ২০০টি দেখানো হচ্ছে", "Showing the first 200"),
  // U3 link sheet (BR9.2; F-08).
  "link.once": L("এই লিংক একবারই দেখানো হবে", "This link is shown only once"),
  "link.this_machine": L(
    "এই লিংক শুধু এই কম্পিউটারে কাজ করবে",
    "This link works on this computer only",
  ),
  "link.copy": L("কপি করুন", "Copy"),
  "link.copied": L("কপি হয়েছে", "Copied"),
  "link.selected": L("লিংকটি নির্বাচিত; কপি করে নিন", "The link is selected; copy it"),
  "link.expires": L("মেয়াদ শেষ হবে", "Expires"),
  "link.close": L("বন্ধ করুন", "Close"),
  // U3 token and recovery screens (BR9.3–BR9.5; frontend-components "Validation").
  "token.gone": L(
    "লিংকটি আর কাজ করে না; নতুন লিংক চান",
    "This link no longer works; ask for a new one",
  ),
  "token.password": L("নতুন পাসওয়ার্ড", "New password"),
  "token.confirm": L("আবার পাসওয়ার্ড", "Password again"),
  "token.mismatch": L("দুটি পাসওয়ার্ড মেলেনি", "The two passwords do not match"),
  "token.accept.submit": L("আমন্ত্রণ গ্রহণ করুন", "Accept the invitation"),
  "token.reset.submit": L("পাসওয়ার্ড বদলান", "Change the password"),
  "recover.submit": L("রিসেট লিংক চান", "Ask for a reset link"),
  "recover.neutral": L(
    "আপনার মালিক বা এই কম্পিউটারের টার্মিনাল থেকে রিসেট লিংক নিন",
    "Get a reset link from your owner or from the terminal on this computer",
  ),
  // U3 review G-05: accept answered 500 after the account was committed.
  "sign_in.account_created": L(
    "অ্যাকাউন্ট তৈরি হয়েছে; সাইন ইন করুন",
    "Your account has been created; please sign in",
  ),
  "sign_in.password_changed": L(
    "পাসওয়ার্ড বদলানো হয়েছে; নতুন পাসওয়ার্ড দিয়ে সাইন ইন করুন",
    "The password has been changed; sign in with the new password",
  ),
  // U4 (BR13.1, BR13.2; mockups §15): the four catalog places in the navigation, and the
  // feature names of the ten catalog screen routes (lock and not-available screens).
  "nav.customers": L("ক্রেতা", "Customers"),
  "nav.products": L("পণ্য", "Products"),
  "nav.low_stock": L("কম মজুদ", "Low stock"),
  "nav.suppliers": L("সরবরাহকারী", "Suppliers"),
  "feature.customers": L("ক্রেতা", "Customers"),
  "feature.customer_new": L("নতুন ক্রেতা", "New customer"),
  "feature.customer_edit": L("ক্রেতা সম্পাদনা", "Edit customer"),
  "feature.products": L("পণ্য", "Products"),
  "feature.product_new": L("নতুন পণ্য", "New product"),
  "feature.product_edit": L("পণ্য সম্পাদনা", "Edit product"),
  "feature.low_stock": L("কম মজুদ", "Low stock"),
  "feature.suppliers": L("সরবরাহকারী", "Suppliers"),
  // U4 (O8, NFR8.20): the nine catalog change-log actions and their subjects
  // (src/catalog/catalog-audit.ts maps every action here, exhaustively).
  "audit.action.customer.create": L("ক্রেতা যোগ", "Customer added"),
  "audit.action.customer.update": L("ক্রেতা সম্পাদনা", "Customer edited"),
  "audit.action.customer.note.add": L("নোট যোগ", "Note added"),
  "audit.action.supplier.create": L("সরবরাহকারী যোগ", "Supplier added"),
  "audit.action.supplier.update": L("সরবরাহকারী সম্পাদনা", "Supplier edited"),
  "audit.action.product.create": L("পণ্য যোগ", "Product added"),
  "audit.action.product.update": L("পণ্য সম্পাদনা", "Product edited"),
  "audit.action.product.photo.set": L("পণ্যের ছবি বদল", "Product photo changed"),
  "audit.action.product.cost.set": L("ক্রয়মূল্য বদল", "Purchase cost changed"),
  "audit.action.variant.stock.set": L("মজুদ বদল", "Stock changed"),
  "audit.subject.customer": L("ক্রেতা", "Customer"),
  "audit.subject.supplier": L("সরবরাহকারী", "Supplier"),
  "audit.subject.product": L("পণ্য", "Product"),
  "audit.subject.variant": L("ধরন", "Variant"),
});

/** True when the table has a row for `key` (labels that may be missing, e.g. audit actions). */
export const hasKey = (key: string): boolean => Object.hasOwn(L_TABLE, key);

export type LKey = keyof typeof L_TABLE;

export const lookup = (key: LKey, locale: Locale): string => {
  const t = L_TABLE[key];
  if (!t) throw new Error(`missing L key: ${String(key)}`);
  return locale === "bn" ? t.bn : t.en;
};
