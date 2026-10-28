/**
 * tests/integration/app.test.tsx — the whole browser app on the real request pipeline
 * (happy-dom; W3, W4, W7, W9; US1.2, US1.3, US1.4, US2.1b; BR8.1–BR8.6).
 *
 * The App's client talks to `handle()` with the SQL stub through a browser-like fetch, so
 * every answer is the server's. Restated flows:
 *  - first run: no business → `#/sign-up`; sign-up lands on `#/orders` with the Owner's email
 *    and role in the header (W3, BR8.6);
 *  - a business exists and nobody is signed in → `#/sign-in`; a gated route is remembered
 *    and sign-in comes back to it (W9);
 *  - creating an order opens the list with the order at the top and "সংরক্ষণ হয়েছে", with
 *    no second list request (BR8.5);
 *  - an empty list says "এখনো কোনো অর্ডার নেই"; a failed list shows the banner and retry
 *    loads it (BR8.3);
 *  - a session that ends in use sends the person to sign-in with "আবার সাইন ইন করুন" and back
 *    afterwards (W9);
 *  - a read-only role opening a create screen gets the lock screen;
 *  - sign-out calls the API, clears the header and opens sign-in (BR8.6);
 *  - an unknown hash shows "পাওয়া যায়নি".
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import * as React from "react";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { createOrdersStore } from "../../src/client/orders-store.js";
import { createSessionStore } from "../../src/client/session-store.js";
import { setLocale } from "../../src/i18n/useTranslations.js";
import { createOrderDraftStore } from "../../src/orders/order-draft.js";
import { App, type AppDeps } from "../../src/router/App.js";
import { browserClient, type BrowserClient } from "../helpers/browser-fetch.js";
import { makeSqlStub } from "../helpers/sql-stub.js";
import { harness, seedBusiness, type Harness } from "../helpers/server-harness.js";

const OWNER = { businessName: "Acme", email: "owner@acme.test", password: "correct-horse-1" };

const go = async (path: string): Promise<void> => {
  await act(async () => {
    window.location.hash = path;
    window.dispatchEvent(new window.HashChangeEvent("hashchange") as unknown as Event);
  });
};

const hash = (): string => window.location.hash.replace(/^#/, "");

const mount = (client: BrowserClient) => {
  const deps: AppDeps = {
    http: client.http,
    auth: client.auth,
    orders: client.orders,
    sessions: createSessionStore(),
    ordersStore: createOrdersStore(),
    draft: createOrderDraftStore(),
  };
  return { deps, view: render(<App deps={deps} />) };
};

let h: Harness;
let client: BrowserClient;

beforeEach(async () => {
  setLocale("bn");
  h = harness(makeSqlStub());
  client = browserClient(h);
  await go("/");
});

afterEach(() => cleanup());

const signInThroughForm = async (
  view: ReturnType<typeof render>,
  email: string,
  password: string,
): Promise<void> => {
  await waitFor(() => expect(view.getByTestId("sign-in-form")).toBeDefined());
  fireEvent.change(view.getByTestId("field-email"), { target: { value: email } });
  fireEvent.change(view.getByTestId("field-password"), { target: { value: password } });
  await act(async () => {
    fireEvent.submit(view.getByTestId("sign-in-form"));
  });
};

describe("the app", () => {
  test("first run goes to sign-up; sign-up lands on the orders list with email and role", async () => {
    const { view } = mount(client);
    await waitFor(() => expect(hash()).toBe("/sign-up"));
    await go("/sign-up");
    await waitFor(() => expect(view.getByTestId("sign-up-form")).toBeDefined());
    fireEvent.change(view.getByTestId("field-businessName"), {
      target: { value: OWNER.businessName },
    });
    fireEvent.change(view.getByTestId("field-email"), { target: { value: OWNER.email } });
    fireEvent.change(view.getByTestId("field-password"), { target: { value: OWNER.password } });
    await act(async () => {
      fireEvent.submit(view.getByTestId("sign-up-form"));
    });
    await waitFor(() => expect(hash()).toBe("/orders"));
    await go("/orders");
    await waitFor(() => expect(view.getByTestId("orders-empty")).toBeDefined());
    expect(view.getByTestId("orders-empty").textContent).toBe("এখনো কোনো অর্ডার নেই");
    expect(view.getByTestId("user-email").textContent).toBe(OWNER.email);
    expect(view.getByTestId("user-role").textContent).toBe("মালিক");
    expect(view.getByTestId("orders-new-manual").getAttribute("href")).toBe("#/orders/new");
  });

  test("signed out on a gated route: sign-in, then back to that route", async () => {
    expect((await client.auth.signUp(OWNER)).ok).toBe(true);
    await client.auth.signOut();
    await go("/orders/new");
    const { view } = mount(client);
    await waitFor(() => expect(hash()).toBe("/sign-in"));
    await go("/sign-in");
    await signInThroughForm(view, OWNER.email, OWNER.password);
    await waitFor(() => expect(hash()).toBe("/orders/new"));
    await go("/orders/new");
    await waitFor(() => expect(view.getByTestId("manual-order-form")).toBeDefined());
  });

  test("a created order is at the top of the list with the saved notice, without a reload", async () => {
    expect((await client.auth.signUp(OWNER)).ok).toBe(true);
    await go("/orders");
    const { view } = mount(client);
    await waitFor(() => expect(view.getByTestId("orders-empty")).toBeDefined());
    await go("/orders/new");
    await waitFor(() => expect(view.getByTestId("manual-order-form")).toBeDefined());
    fireEvent.change(view.getByTestId("manual-line-description-1"), {
      target: { value: "কুর্তি" },
    });
    fireEvent.change(view.getByTestId("manual-line-price-1"), { target: { value: "550" } });
    const listCallsBefore = client.net.calls
      .filter((c) => c.path.startsWith("/api/orders?") || c.path === "/api/orders")
      .filter((c) => c.method === "GET").length;
    await act(async () => {
      fireEvent.submit(view.getByTestId("manual-order-form"));
    });
    await waitFor(() => expect(hash()).toBe("/orders"));
    await go("/orders");
    await waitFor(() => expect(view.getByTestId("orders-saved-notice")).toBeDefined());
    expect(view.getByTestId("orders-saved-notice").textContent).toBe("সংরক্ষণ হয়েছে");
    // U2 (F-05, NFR9.9, G-01): the Shell hosts the announced toast, labelled "সফল".
    const shellToast = view.getByTestId("shell-toast");
    expect(shellToast.querySelector('[data-testid="toast-label"]')?.textContent).toBe("সফল");
    expect(shellToast.querySelector('[data-testid="toast"]')?.textContent).toBe("সংরক্ষণ হয়েছে");
    const rows = view.getAllByTestId("orders-row");
    expect(rows).toHaveLength(1);
    expect(rows[0]?.getAttribute("data-order-id")).toBe(String(h.stub.state.orders[0]?.["id"]));
    const listCallsAfter = client.net.calls
      .filter((c) => c.path.startsWith("/api/orders?") || c.path === "/api/orders")
      .filter((c) => c.method === "GET").length;
    expect(listCallsAfter).toBe(listCallsBefore);
  });

  test("a failed list shows the banner; retry loads it", async () => {
    expect((await client.auth.signUp(OWNER)).ok).toBe(true);
    // Start on a screen that loads no list, then lose the network before opening the list.
    await go("/orders/new");
    const { view } = mount(client);
    await waitFor(() => expect(view.getByTestId("manual-order-form")).toBeDefined());
    client.net.down = true;
    await go("/orders");
    await waitFor(() => expect(view.getByTestId("error-banner")).toBeDefined());
    expect(view.getByTestId("error-banner").getAttribute("data-kind")).toBe("unreachable");
    expect(view.queryByTestId("orders-table")).toBeNull();
    client.net.down = false;
    await act(async () => {
      fireEvent.click(view.getByTestId("error-banner-retry"));
    });
    await waitFor(() => expect(view.getByTestId("orders-empty")).toBeDefined());
    expect(view.queryByTestId("error-banner")).toBeNull();
  });

  test("a session that ends in use: sign-in with the notice, then back where the person was", async () => {
    expect((await client.auth.signUp(OWNER)).ok).toBe(true);
    await go("/orders");
    const { view } = mount(client);
    await waitFor(() => expect(view.getByTestId("orders-empty")).toBeDefined());
    // The session row disappears server-side (expired, signed out elsewhere).
    h.stub.state.sessions.length = 0;
    await go("/orders/new/repeat");
    await waitFor(() => expect(hash()).toBe("/sign-in"));
    await go("/sign-in");
    await waitFor(() => expect(view.getByTestId("sign-in-notice")).toBeDefined());
    expect(view.getByTestId("sign-in-notice").textContent).toBe("আবার সাইন ইন করুন");
    await signInThroughForm(view, OWNER.email, OWNER.password);
    await waitFor(() => expect(hash()).toBe("/orders/new/repeat"));
  });

  test("a read-only role opening a create screen gets the lock screen", async () => {
    const tokens = await seedBusiness(h.stub);
    client.net.jar.token = tokens.accountant;
    await go("/orders/new");
    const { view } = mount(client);
    await waitFor(() => expect(hash()).toBe("/lock"));
    await go("/lock");
    await waitFor(() => expect(view.getByTestId("lock-sheet")).toBeDefined());
    expect(view.getByTestId("lock-message").textContent).toBe("এই অংশ আপনার দায়িত্বের বাইরে");
    expect(view.queryByTestId("manual-save")).toBeNull();
  });

  test("sign-out calls the API, clears the header and opens sign-in", async () => {
    expect((await client.auth.signUp(OWNER)).ok).toBe(true);
    await go("/orders");
    const { view } = mount(client);
    await waitFor(() => expect(view.getByTestId("sign-out")).toBeDefined());
    await act(async () => {
      fireEvent.click(view.getByTestId("sign-out"));
    });
    await waitFor(() => expect(hash()).toBe("/sign-in"));
    expect(
      client.net.calls.some((c) => c.method === "POST" && c.path === "/api/auth/sign-out"),
    ).toBe(true);
    expect(client.net.jar.token).toBeNull();
    expect(view.queryByTestId("user-info")).toBeNull();
  });

  test("an unknown hash shows not found", async () => {
    await go("/nowhere");
    const { view } = mount(client);
    await waitFor(() => expect(hash()).toBe("/not-found"));
    await go("/not-found");
    await waitFor(() => expect(view.getByTestId("screen-title").textContent).toBe("পাওয়া যায়নি"));
  });

  test("the server unreachable at load is a banner with retry", async () => {
    client.net.down = true;
    const { view } = mount(client);
    await waitFor(() => expect(view.getByTestId("error-banner")).toBeDefined());
    expect(view.getByTestId("error-banner").getAttribute("data-kind")).toBe("unreachable");
    client.net.down = false;
    await act(async () => {
      fireEvent.click(view.getByTestId("error-banner-retry"));
    });
    await waitFor(() => expect(view.queryByTestId("error-banner")).toBeNull());
  });
});
