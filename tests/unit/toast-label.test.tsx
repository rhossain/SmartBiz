/**
 * tests/unit/toast-label.test.tsx — no state by colour alone (NFR9.9; review G-01; BR6.2).
 *
 * Restated: every toast tone shows a visible text label in its own element beside the
 * message — "তথ্য" (info), "সতর্কতা" (warn), "সফল" (success), "ত্রুটি" (error), in English
 * "Info", "Warning", "Done", "Error" — while the message element keeps exactly the message
 * text, its role and its tone. The error banner's label is pinned in api-state.test.tsx.
 * The Shell's save toast is the success tone with "সফল" beside "সংরক্ষণ হয়েছে".
 */
import { afterEach, describe, expect, test } from "bun:test";
import * as React from "react";
import { cleanup, render } from "@testing-library/react";
import { setLocale } from "../../src/i18n/useTranslations.js";
import { Toast, type ToastTone } from "../../src/pres/Toast.js";

afterEach(() => {
  cleanup();
  setLocale("bn");
});

describe("toast labels (NFR9.9)", () => {
  test("each tone has its Bangla label beside an unchanged message", () => {
    setLocale("bn");
    const expected: ReadonlyArray<readonly [ToastTone, string, string]> = [
      ["info", "তথ্য", "status"],
      ["warn", "সতর্কতা", "status"],
      ["success", "সফল", "status"],
      ["error", "ত্রুটি", "alert"],
    ];
    for (const [tone, label, role] of expected) {
      const view = render(<Toast message="সংরক্ষণ হয়েছে" tone={tone} />);
      expect({ tone, label: view.getByTestId("toast-label").textContent }).toEqual({ tone, label });
      const message = view.getByTestId("toast");
      expect(message.textContent).toBe("সংরক্ষণ হয়েছে");
      expect(message.getAttribute("role")).toBe(role);
      expect(message.getAttribute("data-tone")).toBe(tone);
      // The label is its own element, not part of the message.
      expect(message.contains(view.getByTestId("toast-label"))).toBe(false);
      cleanup();
    }
  });

  test("English labels; the default tone is info", () => {
    setLocale("en");
    const labels = (["info", "warn", "success", "error"] as const).map((tone) => {
      const v = render(<Toast message="m" tone={tone} />);
      const text = v.getByTestId("toast-label").textContent;
      cleanup();
      return text;
    });
    expect(labels).toEqual(["Info", "Warning", "Done", "Error"]);
    const plain = render(<Toast message="m" />);
    expect(plain.getByTestId("toast-label").getAttribute("data-tone")).toBe("info");
  });
});
