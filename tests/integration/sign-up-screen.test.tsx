/**
 * tests/integration/sign-up-screen.test.tsx — first-run sign-up on the real pipeline
 * (happy-dom; W3; US1.2; BR2.1, BR2.4, BR2.5, BR8.2).
 *
 * Restated: a malformed email gets "সঠিক ইমেইল লিখুন" under the email; a short password gets
 * "পাসওয়ার্ড অন্তত ১০ অক্ষরের হতে হবে" under the password; every typed value stays; a second
 * sign-up once the business exists is told to ask the Owner and offered sign-in; the database
 * being down is a banner with the values kept; success hands the Owner's session to the app.
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import * as React from "react";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import type { SessionResponse } from "../../src/auth/schemas.js";
import { setLocale } from "../../src/i18n/useTranslations.js";
import { SignUpScreen } from "../../src/router/screens/SignUp.js";
import type { ServerDeps } from "../../src/server/types.js";
import { browserClient, type BrowserClient } from "../helpers/browser-fetch.js";
import { makeSqlStub } from "../helpers/sql-stub.js";
import { harness } from "../helpers/server-harness.js";

let client: BrowserClient;

beforeEach(() => {
  setLocale("bn");
  client = browserClient(harness(makeSqlStub()));
});

afterEach(() => cleanup());

const fill = (
  getByTestId: (id: string) => HTMLElement,
  v: { businessName: string; email: string; password: string },
) => {
  fireEvent.change(getByTestId("field-businessName"), { target: { value: v.businessName } });
  fireEvent.change(getByTestId("field-email"), { target: { value: v.email } });
  fireEvent.change(getByTestId("field-password"), { target: { value: v.password } });
};

const submit = async (getByTestId: (id: string) => HTMLElement) => {
  await act(async () => {
    fireEvent.submit(getByTestId("sign-up-form"));
  });
};

const valueOf = (getByTestId: (id: string) => HTMLElement, id: string): string =>
  (getByTestId(id) as HTMLInputElement).value;

describe("sign-up screen", () => {
  test("a malformed email and a short password are shown under their fields; values stay", async () => {
    const view = render(<SignUpScreen signUp={client.auth.signUp} onSignedIn={() => undefined} />);
    fill(view.getByTestId, {
      businessName: "Acme",
      email: "not-an-email",
      password: "long-enough-1",
    });
    await submit(view.getByTestId);
    await waitFor(() => expect(view.getByTestId("field-error-email")).toBeDefined());
    expect(view.getByTestId("field-error-email").textContent).toBe("সঠিক ইমেইল লিখুন");
    expect(valueOf(view.getByTestId, "field-email")).toBe("not-an-email");

    fill(view.getByTestId, { businessName: "Acme", email: "owner@acme.test", password: "short" });
    await submit(view.getByTestId);
    await waitFor(() => expect(view.getByTestId("field-error-password")).toBeDefined());
    expect(view.getByTestId("field-error-password").textContent).toBe(
      "পাসওয়ার্ড অন্তত ১০ অক্ষরের হতে হবে",
    );
    expect(view.queryByTestId("field-error-email")).toBeNull();
    expect(valueOf(view.getByTestId, "field-businessName")).toBe("Acme");
  });

  test("success hands the Owner's session to the app", async () => {
    let got: SessionResponse | null = null;
    const view = render(
      <SignUpScreen
        signUp={client.auth.signUp}
        onSignedIn={(s) => {
          got = s;
        }}
      />,
    );
    fill(view.getByTestId, {
      businessName: "Acme",
      email: "owner@acme.test",
      password: "correct-horse-1",
    });
    await submit(view.getByTestId);
    await waitFor(() => expect(got).not.toBeNull());
    expect(got!).toMatchObject({ user: { email: "owner@acme.test", role: "owner" } });
  });

  test("once the business exists, a second sign-up is told to ask the Owner and offered sign-in", async () => {
    expect(
      (
        await client.auth.signUp({
          businessName: "Acme",
          email: "owner@acme.test",
          password: "correct-horse-1",
        })
      ).ok,
    ).toBe(true);
    const view = render(<SignUpScreen signUp={client.auth.signUp} onSignedIn={() => undefined} />);
    fill(view.getByTestId, {
      businessName: "Other",
      email: "staff@acme.test",
      password: "correct-horse-2",
    });
    await submit(view.getByTestId);
    await waitFor(() => expect(view.getByTestId("sign-up-error")).toBeDefined());
    expect(view.getByTestId("sign-up-error").getAttribute("data-kind")).toBe("business_exists");
    expect(view.getByTestId("sign-up-error").textContent).toContain(
      "এই ব্যবসা আগেই তৈরি হয়েছে। মালিকের কাছে আমন্ত্রণ লিংক চান।",
    );
    expect(view.getByTestId("sign-up-go-sign-in").getAttribute("href")).toBe("#/sign-in");
  });

  test("the database being down is a banner, and every typed value stays (BR2.5)", async () => {
    // A database that refuses every connection: any query or transaction rejects.
    const refused = (): Promise<never> =>
      Promise.reject(Object.assign(new Error("connect ECONNREFUSED"), { code: "ECONNREFUSED" }));
    const deadSql = new Proxy(refused, {
      apply: refused,
      get: () => refused,
    }) as unknown as ServerDeps["sql"];
    const dead = browserClient(harness(makeSqlStub(), { sql: deadSql }));
    const view = render(<SignUpScreen signUp={dead.auth.signUp} onSignedIn={() => undefined} />);
    fill(view.getByTestId, {
      businessName: "Acme",
      email: "owner@acme.test",
      password: "correct-horse-1",
    });
    await submit(view.getByTestId);
    await waitFor(() => expect(view.getByTestId("error-banner")).toBeDefined());
    expect(view.getByTestId("error-banner-message").textContent).toBe(
      "ডাটাবেস চালু নেই। কিছুক্ষণ পর আবার চেষ্টা করুন।",
    );
    expect(valueOf(view.getByTestId, "field-businessName")).toBe("Acme");
    expect(valueOf(view.getByTestId, "field-email")).toBe("owner@acme.test");
    expect(valueOf(view.getByTestId, "field-password")).toBe("correct-horse-1");
  });
});
