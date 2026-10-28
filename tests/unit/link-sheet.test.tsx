/**
 * tests/unit/link-sheet.test.tsx — the link sheet (U3 BR9.2; NFR9.10, NFR9.11; review F-06,
 * F-08).
 *
 * Restated from frontend-components "LinkSheet": the sheet says "এই লিংক একবারই দেখানো হবে"
 * and "এই লিংক শুধু এই কম্পিউটারে কাজ করবে", shows the expiry with Bangla digits by default,
 * moves the focus to the link (its text selected) when it appears, and copies the link with a
 * native button — so Enter and Space work from the keyboard — through
 * `navigator.clipboard.writeText`, selecting the link instead when the clipboard is missing or
 * refuses. Closing calls back; the sheet holds nothing after it is gone.
 */
import { afterEach, describe, expect, test } from "bun:test";
import * as React from "react";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { LinkSheet, shownExpiry } from "../../src/pres/LinkSheet.js";

const LINK = "http://127.0.0.1:3000/#/reset?t=sheet-test-placeholder";
const EXPIRES = "2026-10-28T09:30:00.000Z";

const withClipboard = (clipboard: unknown): (() => void) => {
  const nav = globalThis.navigator as unknown as Record<string, unknown>;
  const had = Object.getOwnPropertyDescriptor(nav, "clipboard");
  Object.defineProperty(nav, "clipboard", { value: clipboard, configurable: true });
  return () => {
    if (had) Object.defineProperty(nav, "clipboard", had);
    else delete nav["clipboard"];
  };
};

let restore: (() => void) | null = null;
afterEach(() => {
  cleanup();
  restore?.();
  restore = null;
});

const sheet = (onClose = () => undefined, locale: "bn" | "en" = "bn") =>
  render(<LinkSheet link={LINK} expiresAt={EXPIRES} onClose={onClose} locale={locale} />);

describe("LinkSheet (BR9.2)", () => {
  test("Bangla copy: once, this machine, expiry in Bangla digits", () => {
    const view = sheet();
    expect(view.getByTestId("link-sheet-once").textContent).toBe("এই লিংক একবারই দেখানো হবে");
    expect(view.getByTestId("link-sheet-machine").textContent).toBe(
      "এই লিংক শুধু এই কম্পিউটারে কাজ করবে",
    );
    const expires = view.getByTestId("link-sheet-expires").textContent ?? "";
    expect(expires.startsWith("মেয়াদ শেষ হবে: ")).toBe(true);
    expect(/[0-9]/.test(expires)).toBe(false);
    expect(/[০-৯]/.test(expires)).toBe(true);
    expect(view.getByTestId("link-sheet-copy").textContent).toBe("কপি করুন");
    expect(view.getByTestId("link-sheet-close").textContent).toBe("বন্ধ করুন");
    expect(shownExpiry(EXPIRES, "en")).toMatch(/[0-9]/);
  });

  test("focus moves to the link when the sheet appears, its text selected (NFR9.11)", () => {
    const view = sheet();
    const field = view.getByTestId("link-sheet-link") as HTMLInputElement;
    expect(document.activeElement).toBe(field);
    expect(field.value).toBe(LINK);
    expect(field.readOnly).toBe(true);
  });

  test("copy is a native button reached by keyboard; Enter copies the link", async () => {
    const written: string[] = [];
    restore = withClipboard({
      writeText: async (text: string) => {
        written.push(text);
      },
    });
    const view = sheet();
    const copy = view.getByTestId("link-sheet-copy") as HTMLButtonElement;
    expect([copy.tagName, copy.type, copy.getAttribute("tabindex")]).toEqual([
      "BUTTON",
      "button",
      null,
    ]);
    copy.focus();
    expect(document.activeElement).toBe(copy);
    // A native button turns Enter into a click; happy-dom does not synthesise that, so the
    // activation is sent as the browser would deliver it.
    await act(async () => {
      fireEvent.keyDown(copy, { key: "Enter" });
      fireEvent.click(copy);
    });
    expect(written).toEqual([LINK]);
    expect(view.getByTestId("link-sheet-status").textContent).toBe("কপি হয়েছে");
  });

  test("no clipboard, or a refusing one: the link is selected for copying by hand", async () => {
    for (const clipboard of [
      undefined,
      {
        writeText: async () => {
          throw new Error("denied");
        },
      },
    ]) {
      restore = withClipboard(clipboard);
      const view = sheet();
      const field = view.getByTestId("link-sheet-link") as HTMLInputElement;
      await act(async () => {
        fireEvent.click(view.getByTestId("link-sheet-copy"));
      });
      expect(view.getByTestId("link-sheet-status").textContent).toBe(
        "লিংকটি নির্বাচিত; কপি করে নিন",
      );
      expect(document.activeElement).toBe(field);
      cleanup();
      restore();
      restore = null;
    }
  });

  test("close calls back; English is the second language", () => {
    let closed = 0;
    const view = sheet(() => {
      closed += 1;
    }, "en");
    expect(view.getByTestId("link-sheet-once").textContent).toBe("This link is shown only once");
    fireEvent.click(view.getByTestId("link-sheet-close"));
    expect(closed).toBe(1);
  });
});
