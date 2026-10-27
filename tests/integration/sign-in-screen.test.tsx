/**
 * tests/integration/sign-in-screen.test.tsx — the sign-in form on the real pipeline
 * (happy-dom; W4, W9; US1.3; BR4.1, BR4.2, BR8.1, BR8.2, BR8.4).
 *
 * The form's client calls go through `handle()` with the SQL stub, so the answers are the
 * server's own. Restated: every failure shows the same "ইমেইল বা পাসওয়ার্ড ভুল" and keeps the
 * typed email; the sixth try in the window shows the minutes to wait in Bangla digits; an
 * over-long field gets its message under that field; an unreachable server is a banner with
 * the values kept; the re-sign-in notice shows after a session ended; success hands the
 * session to the app.
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import * as React from "react";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import type { SessionResponse } from "../../src/auth/schemas.js";
import { setLocale } from "../../src/i18n/useTranslations.js";
import { SignInScreen } from "../../src/router/screens/SignIn.js";
import { browserClient, type BrowserClient } from "../helpers/browser-fetch.js";
import { makeSqlStub } from "../helpers/sql-stub.js";
import { harness } from "../helpers/server-harness.js";

const OWNER = { businessName: "Acme", email: "owner@acme.test", password: "correct-horse-1" };

let client: BrowserClient;

beforeEach(async () => {
  setLocale("bn");
  client = browserClient(harness(makeSqlStub()));
  const up = await client.auth.signUp(OWNER);
  expect(up.ok).toBe(true);
  await client.auth.signOut();
});

afterEach(() => cleanup());

const type = (getByTestId: (id: string) => HTMLElement, email: string, password: string) => {
  fireEvent.change(getByTestId("field-email"), { target: { value: email } });
  fireEvent.change(getByTestId("field-password"), { target: { value: password } });
};

const submit = async (getByTestId: (id: string) => HTMLElement) => {
  await act(async () => {
    fireEvent.submit(getByTestId("sign-in-form"));
  });
};

describe("sign-in screen", () => {
  test("every failure shows the identical message and keeps the typed email", async () => {
    const view = render(<SignInScreen signIn={client.auth.signIn} onSignedIn={() => undefined} />);
    const texts = new Set<string>();
    for (const [email, password] of [
      ["owner@acme.test", "wrong-password"],
      ["nobody@acme.test", "correct-horse-1"],
      ["OWNER@acme.test", "nearly-right-1"],
    ] as const) {
      type(view.getByTestId, email, password);
      await submit(view.getByTestId);
      await waitFor(() => expect(view.getByTestId("sign-in-error")).toBeDefined());
      texts.add(view.getByTestId("sign-in-error").textContent ?? "");
      expect((view.getByTestId("field-email") as HTMLInputElement).value).toBe(email);
    }
    expect([...texts]).toEqual(["ইমেইল বা পাসওয়ার্ড ভুল"]);
  });

  test("the sixth try in the window shows the minutes to wait", async () => {
    const view = render(<SignInScreen signIn={client.auth.signIn} onSignedIn={() => undefined} />);
    for (let i = 0; i < 6; i++) {
      type(view.getByTestId, "owner@acme.test", "wrong-password");
      await submit(view.getByTestId);
      await waitFor(() => expect(view.getByTestId("sign-in-error")).toBeDefined());
    }
    const error = view.getByTestId("sign-in-error");
    expect(error.getAttribute("data-kind")).toBe("rate_limited");
    expect(error.textContent).toBe("অনেকবার চেষ্টা হয়েছে। ১৫ মিনিট পর আবার চেষ্টা করুন।");
  });

  test("a refused field gets its message under the field", async () => {
    const view = render(<SignInScreen signIn={client.auth.signIn} onSignedIn={() => undefined} />);
    type(view.getByTestId, `${"x".repeat(250)}@acme.test`, "whatever-1");
    await submit(view.getByTestId);
    await waitFor(() => expect(view.getByTestId("field-error-email")).toBeDefined());
    expect(view.getByTestId("field-error-email").textContent).toBe("এই ঘরের তথ্য ঠিক নেই");
    expect(view.queryByTestId("field-error-password")).toBeNull();
  });

  test("an unreachable server is a banner and the typed values stay", async () => {
    const view = render(<SignInScreen signIn={client.auth.signIn} onSignedIn={() => undefined} />);
    client.net.down = true;
    type(view.getByTestId, "owner@acme.test", "correct-horse-1");
    await submit(view.getByTestId);
    await waitFor(() => expect(view.getByTestId("error-banner")).toBeDefined());
    expect(view.getByTestId("error-banner-message").textContent).toBe(
      "সার্ভারের সাথে যোগাযোগ হচ্ছে না",
    );
    expect((view.getByTestId("field-email") as HTMLInputElement).value).toBe("owner@acme.test");
    expect((view.getByTestId("field-password") as HTMLInputElement).value).toBe("correct-horse-1");
  });

  test("after a session ended, the notice asks to sign in again", () => {
    const view = render(
      <SignInScreen signIn={client.auth.signIn} onSignedIn={() => undefined} notice="reauth" />,
    );
    expect(view.getByTestId("sign-in-notice").textContent).toBe("আবার সাইন ইন করুন");
  });

  test("success hands the server's session to the app", async () => {
    let got: SessionResponse | null = null;
    const view = render(
      <SignInScreen
        signIn={client.auth.signIn}
        onSignedIn={(s) => {
          got = s;
        }}
      />,
    );
    type(view.getByTestId, "owner@acme.test", "correct-horse-1");
    await submit(view.getByTestId);
    await waitFor(() => expect(got).not.toBeNull());
    expect(got!).toMatchObject({ user: { email: "owner@acme.test", role: "owner" } });
    expect(client.net.jar.token).not.toBeNull();
  });
});
