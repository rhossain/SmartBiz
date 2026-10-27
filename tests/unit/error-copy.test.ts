/**
 * tests/unit/error-copy.test.ts — the error catalogue copy (U1 error catalogue; BR8.2,
 * BR8.3).
 *
 * Restated: every wire kind and `unreachable` has a non-empty message in both locales; the
 * Bangla strings the catalogue fixes are exact; the 429 message carries the minutes (Bangla
 * digits in Bangla); the 500 message carries the correlation id; field messages name the
 * email and password cases and fall back to one plain sentence.
 */
import { describe, expect, test } from "bun:test";
import { ERROR_KINDS } from "../../src/data/error-kinds.js";
import { errorMessage, fieldMessage } from "../../src/i18n/error-copy.js";

const CATALOGUE_BN: Readonly<Record<string, string>> = {
  invalid_credentials: "ইমেইল বা পাসওয়ার্ড ভুল",
  unauthenticated: "আবার সাইন ইন করুন",
  email_taken: "এই ইমেইল আগেই ব্যবহার হয়েছে",
  forbidden: "এই অংশ আপনার দায়িত্বের বাইরে",
  not_found: "পাওয়া যায়নি",
  business_exists: "এই ব্যবসা আগেই তৈরি হয়েছে। মালিকের কাছে আমন্ত্রণ লিংক চান।",
  payload_too_large: "তথ্য অনেক বড়",
  internal: "কিছু একটা ভুল হয়েছে",
  db_unavailable: "ডাটাবেস চালু নেই। কিছুক্ষণ পর আবার চেষ্টা করুন।",
  unreachable: "সার্ভারের সাথে যোগাযোগ হচ্ছে না",
};

describe("error copy", () => {
  test("every kind has a message in both locales", () => {
    for (const kind of [...ERROR_KINDS, "unreachable" as const]) {
      for (const locale of ["bn", "en"] as const) {
        const text = errorMessage(kind, locale);
        expect({ kind, locale, empty: text.trim() === "" }).toEqual({ kind, locale, empty: false });
      }
    }
  });

  test("the catalogue's Bangla strings are exact", () => {
    for (const [kind, text] of Object.entries(CATALOGUE_BN)) {
      expect({ kind, text: errorMessage(kind as never, "bn") }).toEqual({ kind, text });
    }
  });

  test("429 carries the minutes; 500 carries the correlation id", () => {
    expect(errorMessage("rate_limited", "bn", { retryAfterMinutes: 12 })).toBe(
      "অনেকবার চেষ্টা হয়েছে। ১২ মিনিট পর আবার চেষ্টা করুন।",
    );
    expect(errorMessage("rate_limited", "en", { retryAfterMinutes: 3 })).toBe(
      "Too many attempts. Try again in 3 minutes.",
    );
    expect(errorMessage("internal", "en", { correlationId: "abcdef0123456789" })).toBe(
      "Something went wrong (abcdef0123456789)",
    );
  });

  test("field messages", () => {
    expect(fieldMessage("invalid_email", "bn")).toBe("সঠিক ইমেইল লিখুন");
    expect(fieldMessage("password_too_short", "en")).toBe(
      "The password needs at least 10 characters",
    );
    expect(fieldMessage("invalid_input", "bn")).toBe("এই ঘরের তথ্য ঠিক নেই");
  });

  test("an unknown kind throws instead of showing nothing", () => {
    expect(() => errorMessage("teapot" as never, "bn")).toThrow();
  });
});
