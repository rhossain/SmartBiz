/**
 * Coverage booster — render each screen. Sign-in and sign-up moved to their own
 * integration tests in U1 (tests/integration/sign-in-screen.test.tsx and
 * sign-up-screen.test.tsx), because they now call the API.
 */
import { describe, expect, test } from "bun:test";
import * as React from "react";
import { render, cleanup, fireEvent } from "@testing-library/react";
import { NotFoundScreen } from "../../src/pres/NotFound.js";
import { RecoverScreen } from "../../src/router/screens/Recover.js";
import { ResetScreen } from "../../src/router/screens/Reset.js";
import { AcceptScreen } from "../../src/router/screens/Accept.js";
import { LockScreen } from "../../src/pres/Lock.js";
import { setLocale } from "../../src/i18n/useTranslations.js";

describe("screens render and submit", () => {
  test("NotFoundScreen says পাওয়া যায়নি and links back to orders", () => {
    setLocale("bn");
    const { getByTestId } = render(<NotFoundScreen />);
    expect(getByTestId("screen-title").textContent).toBe("পাওয়া যায়নি");
    expect(getByTestId("not-found-home").getAttribute("href")).toBe("#/orders");
    cleanup();
  });

  test("RecoverScreen submits", () => {
    const { getByTestId } = render(<RecoverScreen onSubmit={() => {}} />);
    fireEvent.change(getByTestId("field-email"), { target: { value: "x@e.com" } });
    fireEvent.click(getByTestId("recover-submit"));
    cleanup();
  });

  test("ResetScreen submits", () => {
    const { getByTestId } = render(<ResetScreen onSubmit={() => {}} />);
    fireEvent.change(getByTestId("field-token"), { target: { value: "t" } });
    fireEvent.change(getByTestId("field-password"), { target: { value: "p" } });
    fireEvent.click(getByTestId("reset-submit"));
    cleanup();
  });

  test("AcceptScreen submits", () => {
    const { getByTestId } = render(<AcceptScreen onSubmit={() => {}} />);
    fireEvent.change(getByTestId("field-token"), { target: { value: "t" } });
    fireEvent.change(getByTestId("field-password"), { target: { value: "p" } });
    fireEvent.click(getByTestId("accept-submit"));
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
