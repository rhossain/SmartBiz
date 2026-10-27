/**
 * tests/unit/bnDigits.test.ts — BR6.5.
 */
import { describe, expect, test } from "bun:test";
import { bnDigits } from "../../src/i18n/bnDigits.js";

describe("bnDigits (BR6.5)", () => {
  test("ASCII 0-9 → ০-৯", () => {
    expect(bnDigits("0")).toBe("০");
    expect(bnDigits("5")).toBe("৫");
    expect(bnDigits("9")).toBe("৯");
    expect(bnDigits("0123456789")).toBe("০১২৩৪৫৬৭৮৯");
  });

  test("mixed strings (Bangla + ASCII + spaces)", () => {
    expect(bnDigits("Order 42 of 100")).toBe("Order ৪২ of ১০০");
  });

  test("empty string", () => {
    expect(bnDigits("")).toBe("");
  });

  test("non-digit characters are unchanged", () => {
    expect(bnDigits("abc 12,345.00")).toBe("abc ১২,৩৪৫.০০");
  });
});
