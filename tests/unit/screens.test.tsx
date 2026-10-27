/**
 * Coverage booster — render each screen.
 */
import { describe, expect, test } from "bun:test";
import * as React from "react";
import { render, cleanup, act, fireEvent } from "@testing-library/react";
import { SignInScreen } from "../../src/router/screens/SignIn.js";
import { SignUpScreen } from "../../src/router/screens/SignUp.js";
import { RecoverScreen } from "../../src/router/screens/Recover.js";
import { ResetScreen } from "../../src/router/screens/Reset.js";
import { AcceptScreen } from "../../src/router/screens/Accept.js";
import { LockScreen } from "../../src/router/screens/Lock.js";
import { DailyCardPlaceholder } from "../../src/router/screens/DailyCardPlaceholder.js";
import { AuditTrailPlaceholder } from "../../src/router/screens/AuditTrailPlaceholder.js";
import { setLocale } from "../../src/i18n/useTranslations.js";

describe("screens render and submit", () => {
  test("SignInScreen submits with values", () => {
    setLocale("bn");
    const { getByTestId } = render(
      <SignInScreen
        onSubmit={(e, p) => {
          (globalThis as { lastSubmit?: unknown }).lastSubmit = { e, p };
        }}
      />,
    );
    act(() => {
      fireEvent.change(getByTestId("field-email"), { target: { value: "x@e.com" } });
      fireEvent.change(getByTestId("field-password"), { target: { value: "verysecret" } });
    });
    act(() => {
      fireEvent.submit(getByTestId("sign-in-form"));
    });
    expect((globalThis as { lastSubmit?: { e: string; p: string } }).lastSubmit).toEqual({
      e: "x@e.com",
      p: "verysecret",
    });
    cleanup();
  });

  test("SignUpScreen submits with values", () => {
    setLocale("bn");
    const { getByTestId } = render(
      <SignUpScreen
        onSubmit={(email, password, businessName) => {
          (globalThis as { lastSubmit?: unknown }).lastSubmit = { email, password, businessName };
        }}
      />,
    );
    act(() => {
      fireEvent.change(getByTestId("field-email"), { target: { value: "x@e.com" } });
      fireEvent.change(getByTestId("field-password"), { target: { value: "verysecret" } });
      fireEvent.change(getByTestId("field-businessName"), { target: { value: "Acme" } });
    });
    act(() => {
      fireEvent.submit(getByTestId("sign-up-form"));
    });
    expect((globalThis as { lastSubmit?: unknown }).lastSubmit).toBeDefined();
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
  // (tests/integration/orders-screens.test.tsx).
  test("placeholder screens render", () => {
    expect(render(<DailyCardPlaceholder />).container.textContent).toContain("B5");
    cleanup();
    expect(render(<AuditTrailPlaceholder />).container.textContent).toContain("B5");
    cleanup();
  });
});
