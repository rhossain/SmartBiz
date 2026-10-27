/**
 * tests/unit/role-lock-reach.test.ts — NFR4.2.
 * Every LockSheet interaction is keyboard-reachable (Tab order, focus ring).
 */
import { describe, expect, test } from "bun:test";
import * as React from "react";
import { render, cleanup } from "@testing-library/react";
import { LockScreen } from "../../src/pres/Lock.js";
import { LockSheet } from "../../src/pres/LockSheet.js";
import { setLocale } from "../../src/i18n/useTranslations.js";

describe("NFR4.2 — LockSheet keyboard reach", () => {
  test("sheet has role=dialog and is focusable", () => {
    setLocale("bn");
    const { container } = render(<LockSheet messageKey="lock.message" />);
    const sheet = container.querySelector('[data-testid="lock-sheet"]');
    expect(sheet).not.toBeNull();
    expect(sheet?.getAttribute("role")).toBe("dialog");
    expect(sheet?.getAttribute("aria-modal")).toBe("true");
    cleanup();
  });

  test("dismiss button is focusable", () => {
    setLocale("bn");
    const { container } = render(<LockSheet messageKey="lock.message" onDismiss={() => {}} />);
    const btn = container.querySelector('[data-testid="lock-dismiss"]') as HTMLButtonElement | null;
    expect(btn).not.toBeNull();
    btn?.focus();
    expect(document.activeElement).toBe(btn);
    cleanup();
  });

  // U1: the lock screen moved to src/pres (R-02) and says the catalogue's `forbidden` copy.
  test("the moved LockScreen shows the forbidden copy and is focusable", () => {
    setLocale("bn");
    const { container } = render(<LockScreen />);
    const sheet = container.querySelector('[data-testid="lock-sheet"]') as HTMLElement | null;
    expect(sheet?.getAttribute("tabindex")).toBe("-1");
    expect(container.querySelector('[data-testid="lock-message"]')?.textContent).toBe(
      "এই অংশ আপনার দায়িত্বের বাইরে",
    );
    cleanup();
  });
});
