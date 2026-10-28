/**
 * tests/unit/catalog-phone.test.ts — phone normalisation and the search query (U4 BR2.1,
 * BR5.1, BR5.2; S32; Q3, Q5).
 *
 * Restated from the rules, not imported: a phone is stored as `01` + one of 3–9 + 8 digits
 * after Bangla digits become ASCII, separators go and a leading +880 / 880 becomes 0; a query
 * searches the phone only with 4+ digits; `%`, `_` and `\` in a name query are literal.
 */
import { describe, expect, test } from "bun:test";
import {
  digitsHint,
  escapeLike,
  normalisePhone,
  searchTerms,
} from "../../src/catalog/rules/phone.js";

describe("normalisePhone (BR2.1)", () => {
  test.each([
    ["01712345678", "01712345678"],
    ["০১৭১২৩৪৫৬৭৮", "01712345678"],
    ["+8801712345678", "01712345678"],
    ["8801712345678", "01712345678"],
    ["017-1234-5678", "01712345678"],
    [" (017) 12.34 5678 ", "01712345678"],
    ["+880 ১৯৯৯-৯৯৯৯৯৯", "01999999999"],
    ["01312345678", "01312345678"],
  ])("%s is stored as %s", (raw, stored) => {
    expect(normalisePhone(raw)).toBe(stored);
  });

  test.each([
    "01212345678", // 2 is not a mobile operator digit
    "0171234567", // 10 digits
    "017123456789", // 12 digits
    "1712345678",
    "abc01712345678",
    "",
    "+8811712345678",
  ])("%s is refused", (raw) => {
    expect(normalisePhone(raw)).toBeNull();
  });
});

describe("searchTerms (BR5.1, S32)", () => {
  test("an empty query lists everyone", () => {
    expect(searchTerms("   ")).toEqual({ namePattern: null, phonePattern: null });
    expect(searchTerms(undefined)).toEqual({ namePattern: null, phonePattern: null });
  });

  test("4 or more digits search the phone too, Bangla digits included", () => {
    expect(searchTerms("5678")).toEqual({ namePattern: "%5678%", phonePattern: "%5678%" });
    expect(searchTerms("০১৭১")).toEqual({ namePattern: "%0171%", phonePattern: "%0171%" });
    expect(searchTerms("017-12")).toEqual({ namePattern: "%017-12%", phonePattern: "%01712%" });
  });

  test("a leading 880 or +880 becomes 0 for the phone search", () => {
    expect(searchTerms("+880171")?.phonePattern).toBe("%0171%");
    expect(searchTerms("8801712")?.phonePattern).toBe("%01712%");
  });

  test("fewer than 4 digits, or letters, search names only", () => {
    expect(searchTerms("171")).toEqual({ namePattern: "%171%", phonePattern: null });
    expect(searchTerms("রিনা")).toEqual({ namePattern: "%রিনা%", phonePattern: null });
    expect(searchTerms("rina 5678")?.phonePattern).toBeNull();
  });

  test("% _ and backslash are escaped, so they match literally", () => {
    expect(escapeLike("50%")).toBe("50\\%");
    expect(escapeLike("a_b")).toBe("a\\_b");
    expect(escapeLike("x\\y")).toBe("x\\\\y");
    expect(searchTerms("50%").namePattern).toBe("%50\\%%");
  });

  test("the 4-digit hint shows for 1–3 digits only (BR5.2)", () => {
    expect(digitsHint("12")).toBe(true);
    expect(digitsHint("১২৩")).toBe(true);
    expect(digitsHint("1234")).toBe(false);
    expect(digitsHint("রিনা")).toBe(false);
    expect(digitsHint("")).toBe(false);
  });
});
