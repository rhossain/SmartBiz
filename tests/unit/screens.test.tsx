/**
 * Coverage booster — render each screen. Sign-in and sign-up moved to their own
 * integration tests in U1 (tests/integration/sign-in-screen.test.tsx and
 * sign-up-screen.test.tsx), because they now call the API. U3 rewrote Accept, Reset and
 * Recover as props-only screens; their behaviour with the containers is in
 * tests/integration/token-screens.test.tsx. Here: they render, check their fields before
 * calling back, and call back with what was typed.
 */
import { describe, expect, test } from "bun:test";
import * as React from "react";
import { act, render, cleanup, fireEvent } from "@testing-library/react";
import { NotFoundScreen } from "../../src/pres/NotFound.js";
import { RecoverScreen } from "../../src/router/screens/Recover.js";
import { ResetScreen } from "../../src/router/screens/Reset.js";
import { AcceptScreen } from "../../src/router/screens/Accept.js";
import { LockScreen } from "../../src/pres/Lock.js";
import { setLocale } from "../../src/i18n/useTranslations.js";

const fill = (get: (id: string) => HTMLElement, password: string, confirm = password): void => {
  fireEvent.change(get("field-password"), { target: { value: password } });
  fireEvent.change(get("field-confirm"), { target: { value: confirm } });
};

describe("screens render and submit", () => {
  test("NotFoundScreen says পাওয়া যায়নি and links back to orders", () => {
    setLocale("bn");
    const { getByTestId } = render(<NotFoundScreen />);
    expect(getByTestId("screen-title").textContent).toBe("পাওয়া যায়নি");
    expect(getByTestId("not-found-home").getAttribute("href")).toBe("#/orders");
    cleanup();
  });

  test("RecoverScreen calls back with the email and then shows the neutral sentence", async () => {
    setLocale("bn");
    const sent: string[] = [];
    const { getByTestId } = render(
      <RecoverScreen
        onSubmit={async (email) => {
          sent.push(email);
          return "done";
        }}
      />,
    );
    fireEvent.change(getByTestId("field-email"), { target: { value: "x@e.com" } });
    await act(async () => {
      fireEvent.click(getByTestId("recover-submit"));
    });
    expect(sent).toEqual(["x@e.com"]);
    expect(getByTestId("recover-neutral").textContent).toBe(
      "আপনার মালিক বা এই কম্পিউটারের টার্মিনাল থেকে রিসেট লিংক নিন",
    );
    cleanup();
  });

  test("ResetScreen checks length and confirmation before calling back", async () => {
    setLocale("bn");
    const sent: string[] = [];
    const { getByTestId, queryByTestId } = render(
      <ResetScreen
        hasToken
        onSubmit={async (p) => {
          sent.push(p);
          return null;
        }}
      />,
    );
    fill(getByTestId, "short");
    fireEvent.click(getByTestId("reset-submit"));
    expect(getByTestId("field-error-password").textContent).toBe(
      "পাসওয়ার্ড অন্তত ১০ অক্ষরের হতে হবে",
    );
    fill(getByTestId, "long-enough-1", "long-enough-2");
    fireEvent.click(getByTestId("reset-submit"));
    expect(getByTestId("field-error-confirm").textContent).toBe("দুটি পাসওয়ার্ড মেলেনি");
    expect(sent).toEqual([]);
    fill(getByTestId, "long-enough-1");
    await act(async () => {
      fireEvent.click(getByTestId("reset-submit"));
    });
    expect(sent).toEqual(["long-enough-1"]);
    expect(queryByTestId("field-error-confirm")).toBeNull();
    cleanup();
  });

  test("AcceptScreen without a token shows the gone message and no form", () => {
    setLocale("bn");
    const { getByTestId, queryByTestId } = render(
      <AcceptScreen hasToken={false} onSubmit={async () => null} />,
    );
    expect(getByTestId("screen-title").textContent).toBe("আমন্ত্রণ গ্রহণ");
    expect(getByTestId("accept-gone").textContent).toBe("লিংকটি আর কাজ করে না; নতুন লিংক চান");
    expect(queryByTestId("accept-form")).toBeNull();
    cleanup();
  });

  test("AcceptScreen with a token calls back with the password", async () => {
    const sent: string[] = [];
    const { getByTestId } = render(
      <AcceptScreen
        hasToken
        onSubmit={async (p) => {
          sent.push(p);
          return null;
        }}
      />,
    );
    fill(getByTestId, "long-enough-3");
    await act(async () => {
      fireEvent.click(getByTestId("accept-submit"));
    });
    expect(sent).toEqual(["long-enough-3"]);
    cleanup();
  });

  test("LockScreen renders LockSheet", () => {
    const { container } = render(<LockScreen />);
    expect(container.querySelector('[data-testid="lock-sheet"]')).not.toBeNull();
    cleanup();
  });

  // The B1 orders placeholder was replaced by the real U3 screens in B2
  // (tests/integration/orders-screens.test.tsx). U2 replaced the daily-card and audit-trail
  // placeholders: the audit trail is real (tests/integration/audit-trail-screen.test.tsx) and
  // the daily card renders the not-available screen (tests/unit/not-available.test.tsx).
});
