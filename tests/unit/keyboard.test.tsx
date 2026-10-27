/**
 * tests/unit/keyboard.test.tsx — keyboard reach and Enter-to-submit (BR9.2; NFR9.7;
 * AC1.7.6).
 *
 * Restated for sign-in, the order list (with quick-add and filters) and the manual order
 * form:
 *  - every control is a native control (button, input, select, textarea, a with href) and
 *    none is taken out of the Tab order (`tabIndex` -1); anything else that is focusable
 *    has `tabIndex` 0 — no clickable div or span posing as a button;
 *  - every place that saves or filters is a real `<form>` with a submit control, so Enter in
 *    any of its fields submits it; submitting runs the screen's own save or filter.
 * The visible focus ring itself is asserted by tests/unit/stylesheet.test.ts (BR9.3).
 */
import { afterEach, describe, expect, test } from "bun:test";
import * as React from "react";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { setLocale } from "../../src/i18n/useTranslations.js";
import { createOrderDraftStore } from "../../src/orders/order-draft.js";
import { ManualOrder } from "../../src/orders/screens/ManualOrder.js";
import { OrdersList } from "../../src/orders/screens/OrdersList.js";
import { SignInScreen } from "../../src/router/screens/SignIn.js";

afterEach(() => cleanup());

const NATIVE = new Set(["BUTTON", "INPUT", "SELECT", "TEXTAREA", "A"]);

/** Every element a keyboard user may need, with what is wrong with it (empty when fine). */
const keyboardProblems = (root: HTMLElement): string[] => {
  const problems: string[] = [];
  for (const el of root.querySelectorAll<HTMLElement>("*")) {
    const tag = el.tagName;
    const tabIndex = el.getAttribute("tabindex");
    const role = el.getAttribute("role");
    if (NATIVE.has(tag)) {
      if (tag === "A" && !el.hasAttribute("href"))
        problems.push(`<a> without href: ${el.outerHTML}`);
      if (tabIndex === "-1") problems.push(`control out of the Tab order: ${el.outerHTML}`);
    } else if (role === "button" || role === "link") {
      problems.push(`${role} on a non-native <${tag.toLowerCase()}>`);
    } else if (tabIndex !== null && tabIndex !== "0" && tabIndex !== "-1") {
      problems.push(`tabIndex ${tabIndex} on <${tag.toLowerCase()}>`);
    }
  }
  return problems;
};

const formsHaveSubmit = (root: HTMLElement): string[] =>
  [...root.querySelectorAll("form")].flatMap((form) =>
    form.querySelector('button[type="submit"], input[type="submit"]') === null
      ? [form.getAttribute("data-testid") ?? "form"]
      : [],
  );

describe("keyboard reach and Enter (BR9.2)", () => {
  test("sign-in: native controls in a real form; submitting signs in", async () => {
    setLocale("bn");
    const sent: string[] = [];
    const view = render(
      <SignInScreen
        signIn={async (input) => {
          sent.push(input.email);
          return {
            ok: false,
            kind: "invalid_credentials",
            status: 401,
            fields: [],
            retryAfterMinutes: null,
            correlationId: null,
          };
        }}
        onSignedIn={() => undefined}
      />,
    );
    expect(keyboardProblems(view.container)).toEqual([]);
    expect(formsHaveSubmit(view.container)).toEqual([]);
    const email = view.getByTestId("field-email");
    expect(email.closest("form")).toBe(view.getByTestId("sign-in-form") as HTMLFormElement);
    fireEvent.change(email, { target: { value: "owner@acme.test" } });
    fireEvent.change(view.getByTestId("field-password"), { target: { value: "correct-horse-1" } });
    await act(async () => {
      fireEvent.submit(view.getByTestId("sign-in-form"));
    });
    expect(sent).toEqual(["owner@acme.test"]);
  });

  test("the order list: quick-add and filters are real forms; no control leaves the Tab order", async () => {
    setLocale("bn");
    const filtered: unknown[] = [];
    const view = render(
      <OrdersList
        orders={[]}
        nextCursor={null}
        locale="bn"
        canMutate
        draft={createOrderDraftStore()}
        onOpen={() => undefined}
        onLoadMore={() => undefined}
        onFilter={(f) => filtered.push(f)}
        onSave={async () => ({ ok: false, error: { kind: "unreachable" } })}
      />,
    );
    expect(keyboardProblems(view.container)).toEqual([]);
    expect(formsHaveSubmit(view.container)).toEqual([]);
    expect(view.container.querySelectorAll("form").length).toBeGreaterThanOrEqual(2);
    const quick = view.getByTestId("orders-quick-add");
    expect(view.getByTestId("quick-add-description").closest("form")).toBe(
      quick as HTMLFormElement,
    );
    await act(async () => {
      fireEvent.submit(
        view.getByTestId("quick-add-description").closest("form") as HTMLFormElement,
      );
    });
    const filters = view.getByTestId("orders-filter-apply").closest("form") as HTMLFormElement;
    await act(async () => {
      fireEvent.submit(filters);
    });
    expect(filtered).toHaveLength(1);
  });

  test("the manual order form: Enter in a field submits the save, once", async () => {
    setLocale("bn");
    let saves = 0;
    const view = render(
      <ManualOrder
        locale="bn"
        draft={createOrderDraftStore()}
        onSave={async () => {
          saves += 1;
          return { ok: false, error: { kind: "unreachable" } };
        }}
      />,
    );
    expect(keyboardProblems(view.container)).toEqual([]);
    expect(formsHaveSubmit(view.container)).toEqual([]);
    fireEvent.change(view.getByTestId("manual-line-description-1"), {
      target: { value: "কুর্তি" },
    });
    fireEvent.change(view.getByTestId("manual-line-price-1"), { target: { value: "550" } });
    const form = view.getByTestId("manual-order-form");
    expect(view.getByTestId("manual-line-price-1").closest("form")).toBe(form as HTMLFormElement);
    await act(async () => {
      fireEvent.submit(form);
      fireEvent.submit(form);
    });
    expect(saves).toBe(1);
  });
});
