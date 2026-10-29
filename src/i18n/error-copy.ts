/**
 * src/i18n/error-copy.ts — what the person is told for each error kind (U1 error catalogue;
 * BR8.2, BR8.3; FR11.2).
 *
 * Keyed by the closed `ErrorKind` union plus the client-only `unreachable`, through one
 * exhaustive switch: a new kind on the wire does not compile until it has a message here
 * (team.md: kinds are never reworded, so the copy is keyed by the kind itself). The Bangla
 * strings are the catalogue's; English is the second locale. Field-level messages for 400s
 * are one plain sentence per refused field, because zod's own messages are English and
 * technical. The 429 message carries the minutes from the answer; the 500 message carries
 * the correlation id so the Owner can find the log line.
 */
import { assertNever } from "../data/assert-never.js";
import type { Locale } from "../data/enums.js";
import type { ErrorKind } from "../data/error-kinds.js";
import { bnDigits } from "./bnDigits.js";
import { L } from "./L.js";
import type { Translation } from "./types.js";

export type ShownErrorKind = ErrorKind | "unreachable";

export interface ErrorCopyDetail {
  readonly retryAfterMinutes?: number | null;
  readonly correlationId?: string | null;
  /** insufficient_stock: the answer's fields (`stock.<sku>` / `required N, available M`). */
  readonly fields?: ReadonlyArray<{ readonly path: string; readonly message: string }> | null;
}

/** One short variant read back from an insufficient_stock field; null when malformed. */
export const parseShortage = (field: {
  readonly path: string;
  readonly message: string;
}): { readonly sku: string; readonly required: number; readonly available: number } | null => {
  const m = /^required (\d+), available (\d+)$/.exec(field.message);
  if (!field.path.startsWith("stock.") || m === null) return null;
  return {
    sku: field.path.slice("stock.".length),
    required: Number(m[1]),
    available: Number(m[2]),
  };
};

const digits = (n: number, locale: Locale): string =>
  locale === "bn" ? bnDigits(String(n)) : String(n);

const pick = (t: Translation, locale: Locale): string => (locale === "bn" ? t.bn : t.en);

export const FIELD_INVALID = L("এই ঘরের তথ্য ঠিক নেই", "This field is not valid");
export const FIELD_EMAIL = L("সঠিক ইমেইল লিখুন", "Enter a valid email");
export const FIELD_PASSWORD_SHORT = L(
  "পাসওয়ার্ড অন্তত ১০ অক্ষরের হতে হবে",
  "The password needs at least 10 characters",
);
export const SIGN_IN_AGAIN = L("আবার সাইন ইন করুন", "Please sign in again");

export const errorMessage = (
  kind: ShownErrorKind,
  locale: Locale,
  detail: ErrorCopyDetail = {},
): string => {
  switch (kind) {
    case "invalid_input":
      return pick(L("কিছু তথ্য ঠিক নেই", "Some details are not valid"), locale);
    case "invalid_email":
      return pick(FIELD_EMAIL, locale);
    case "password_too_short":
      return pick(FIELD_PASSWORD_SHORT, locale);
    case "invalid_credentials":
      return pick(L("ইমেইল বা পাসওয়ার্ড ভুল", "Wrong email or password"), locale);
    case "unauthenticated":
      return pick(SIGN_IN_AGAIN, locale);
    case "email_taken":
      return pick(L("এই ইমেইল আগেই ব্যবহার হয়েছে", "This email is already in use"), locale);
    case "forbidden":
      return pick(L("এই অংশ আপনার দায়িত্বের বাইরে", "This is outside your role"), locale);
    case "not_found":
      return pick(L("পাওয়া যায়নি", "Not found"), locale);
    case "business_exists":
      return pick(
        L(
          "এই ব্যবসা আগেই তৈরি হয়েছে। মালিকের কাছে আমন্ত্রণ লিংক চান।",
          "This business is already set up. Ask the owner for an invitation link.",
        ),
        locale,
      );
    case "not_editable":
      return pick(
        L("এই অবস্থায় অর্ডারটি আর বদলানো যায় না", "The order can no longer be changed"),
        locale,
      );
    case "invalid_transition":
      return pick(
        L("এই অবস্থা থেকে ওই অবস্থায় যাওয়া যায় না", "The order cannot move to that status"),
        locale,
      );
    case "insufficient_stock": {
      const base = pick(L("স্টকে যথেষ্ট মাল নেই", "Not enough stock"), locale);
      const items = (detail.fields ?? [])
        .map(parseShortage)
        .filter((s): s is NonNullable<typeof s> => s !== null)
        .map((s) =>
          locale === "bn"
            ? `${s.sku} — দরকার ${digits(s.required, locale)}, আছে ${digits(s.available, locale)}`
            : `${s.sku} — need ${s.required}, have ${s.available}`,
        );
      return items.length > 0 ? `${base}: ${items.join("; ")}` : base;
    }
    case "already_linked":
      return pick(
        L("এই অর্ডারে আগেই কনসাইনমেন্ট যুক্ত আছে", "A consignment is already linked"),
        locale,
      );
    case "conflict":
      return pick(
        L("অন্য কেউ এটি বদলেছে, আবার লোড করুন", "Someone else changed this; reload it"),
        locale,
      );
    case "gone":
      return pick(L("লিংকটির মেয়াদ শেষ", "The link has expired"), locale);
    case "payload_too_large":
      return pick(L("তথ্য অনেক বড়", "The data is too large"), locale);
    case "rate_limited": {
      const minutes = digits(detail.retryAfterMinutes ?? 15, locale);
      return locale === "bn"
        ? `অনেকবার চেষ্টা হয়েছে। ${minutes} মিনিট পর আবার চেষ্টা করুন।`
        : `Too many attempts. Try again in ${minutes} minutes.`;
    }
    case "internal": {
      const base = pick(L("কিছু একটা ভুল হয়েছে", "Something went wrong"), locale);
      return detail.correlationId ? `${base} (${detail.correlationId})` : base;
    }
    case "db_unavailable":
      return pick(
        L(
          "ডাটাবেস চালু নেই। কিছুক্ষণ পর আবার চেষ্টা করুন।",
          "The database is not running. Try again shortly.",
        ),
        locale,
      );
    case "unreachable":
      return pick(L("সার্ভারের সাথে যোগাযোগ হচ্ছে না", "Cannot reach the server"), locale);
    default:
      return assertNever(kind, "error kind");
  }
};

/** The message under one refused field (BR8.2). */
export const fieldMessage = (kind: ShownErrorKind, locale: Locale): string => {
  if (kind === "invalid_email") return pick(FIELD_EMAIL, locale);
  if (kind === "password_too_short") return pick(FIELD_PASSWORD_SHORT, locale);
  return pick(FIELD_INVALID, locale);
};
