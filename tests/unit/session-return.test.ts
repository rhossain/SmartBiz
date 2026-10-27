/**
 * tests/unit/session-return.test.ts — W9 in the client (BR8.1).
 *
 * Restated: a 401 in use stores the current route (in memory), shows the re-sign-in notice
 * and goes to `#/sign-in`; after sign-in the app returns to that route once, or to
 * `#/orders` when none was stored; public routes are never stored as a return target;
 * signing out on purpose clears everything.
 */
import { afterEach, describe, expect, test } from "bun:test";
import * as React from "react";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { createOrdersStore } from "../../src/client/orders-store.js";
import {
  createSessionStore,
  DEFAULT_RETURN_ROUTE,
  needsSignIn,
  rememberRoute,
  returnRoute,
  sessionEnded,
  signedIn,
  signedOut,
} from "../../src/client/session-store.js";
import type { SessionResponse } from "../../src/auth/schemas.js";
import { setLocale } from "../../src/i18n/useTranslations.js";
import { createOrderDraftStore } from "../../src/orders/order-draft.js";
import { App } from "../../src/router/App.js";
import { browserClient } from "../helpers/browser-fetch.js";
import { makeSqlStub } from "../helpers/sql-stub.js";
import { harness } from "../helpers/server-harness.js";

const SESSION: SessionResponse = {
  user: {
    id: "0f0f0f0f-0f0f-4f0f-8f0f-0f0f0f0f0f0f",
    email: "owner@acme.test",
    role: "owner",
    locale: "bn",
  },
  businessId: "b0000000-0000-4000-8000-00000000000b",
  capabilities: ["business.view"],
};

describe("session return (W9)", () => {
  test("a 401 stores the route, shows the notice and goes to sign-in; sign-in returns there once", () => {
    const store = createSessionStore();
    signedIn(store, SESSION);
    const went: string[] = [];
    sessionEnded(store, "/orders/0f0f0f0f-0f0f-4f0f-8f0f-0f0f0f0f0f0f", (to) => went.push(to));
    expect(went).toEqual(["/sign-in"]);
    expect(store.get()).toEqual({
      status: "signed_out",
      session: null,
      notice: "reauth",
      returnTo: "/orders/0f0f0f0f-0f0f-4f0f-8f0f-0f0f0f0f0f0f",
    });
    signedIn(store, SESSION);
    expect(store.get().notice).toBeNull();
    expect(returnRoute(store)).toBe("/orders/0f0f0f0f-0f0f-4f0f-8f0f-0f0f0f0f0f0f");
    expect(returnRoute(store)).toBe(DEFAULT_RETURN_ROUTE);
  });

  test("with nothing stored, sign-in goes to #/orders", () => {
    const store = createSessionStore();
    expect(DEFAULT_RETURN_ROUTE).toBe("/orders");
    expect(returnRoute(store)).toBe("/orders");
  });

  test("public routes are never a return target; an earlier target is kept", () => {
    const store = createSessionStore();
    for (const route of ["/", "/sign-in", "/sign-up", "/lock", "/not-found", "/recover"]) {
      needsSignIn(store, route);
      expect({ route, returnTo: store.get().returnTo }).toEqual({ route, returnTo: null });
    }
    needsSignIn(store, "/orders/new");
    sessionEnded(store, "/sign-in", () => undefined);
    expect(store.get().returnTo).toBe("/orders/new");
  });

  test("on load without a session the target is kept but there is no notice", () => {
    const store = createSessionStore();
    needsSignIn(store, "/orders/new/paste-parse");
    expect(store.get()).toMatchObject({ notice: null, returnTo: "/orders/new/paste-parse" });
  });

  /*
   * U2 (S16, R9; D-01, F-06; NFR5.7, NFR7.12): the stored route is the PATH only. A token in
   * a query is never remembered, and `/accept-invite` (which replaced `/accept`) is never a
   * return target at all.
   */
  test("U2: #/accept-invite?t=abc signed out stores nothing; #/orders?x=1 stores /orders", () => {
    const store = createSessionStore();
    needsSignIn(store, "/accept-invite?t=abc");
    expect(store.get().returnTo).toBeNull();
    needsSignIn(store, "/orders?x=1");
    expect(store.get().returnTo).toBe("/orders");
    signedIn(store, SESSION);
    sessionEnded(store, "/orders/new/repeat?t=abc&x=1", () => undefined);
    expect(store.get().returnTo).toBe("/orders/new/repeat");
    rememberRoute(store, "/orders/new?x=1");
    expect(store.get().returnTo).toBe("/orders/new");
    expect(returnRoute(store)).toBe("/orders/new");
  });

  test("signing out on purpose clears the session, notice and target", () => {
    const store = createSessionStore();
    signedIn(store, SESSION);
    sessionEnded(store, "/orders", () => undefined);
    signedOut(store);
    expect(store.get()).toEqual({
      status: "signed_out",
      session: null,
      notice: null,
      returnTo: null,
    });
  });
});

/*
 * The same rule seen from the network (S16, D-01): the whole app runs on the real request
 * pipeline (SQL stub) in happy-dom; after the 401 handoff and sign-in, no request URL the
 * browser sends carries `t=` or `x=` from the query the person had in the address bar.
 */
describe("session return in the running app (U2 S16)", () => {
  const OWNER = { businessName: "Acme", email: "owner@acme.test", password: "correct-horse-1" };
  const go = async (path: string): Promise<void> => {
    await act(async () => {
      window.location.hash = path;
      window.dispatchEvent(new window.HashChangeEvent("hashchange") as unknown as Event);
    });
  };
  const hash = (): string => window.location.hash.replace(/^#/, "");

  afterEach(() => cleanup());

  const setup = async () => {
    setLocale("bn");
    const h = harness(makeSqlStub());
    const client = browserClient(h);
    expect((await client.auth.signUp(OWNER)).ok).toBe(true);
    const deps = {
      http: client.http,
      auth: client.auth,
      orders: client.orders,
      sessions: createSessionStore(),
      ordersStore: createOrdersStore(),
      draft: createOrderDraftStore(),
    };
    return { h, client, deps };
  };

  const signIn = async (view: ReturnType<typeof render>): Promise<void> => {
    await go("/sign-in");
    await waitFor(() => expect(view.getByTestId("sign-in-form")).toBeDefined());
    fireEvent.change(view.getByTestId("field-email"), { target: { value: OWNER.email } });
    fireEvent.change(view.getByTestId("field-password"), { target: { value: OWNER.password } });
    await act(async () => {
      fireEvent.submit(view.getByTestId("sign-in-form"));
    });
  };

  test("a session ending on #/orders/new/repeat?x=1 returns to the path, and x= is never sent", async () => {
    const { h, client, deps } = await setup();
    await go("/orders?x=1");
    const view = render(React.createElement(App, { deps }));
    await waitFor(() => expect(view.getByTestId("orders-empty")).toBeDefined());
    h.stub.state.sessions.length = 0;
    await go("/orders/new/repeat?x=1");
    await waitFor(() => expect(hash()).toBe("/sign-in"));
    expect(deps.sessions.get().returnTo).toBe("/orders/new/repeat");
    await signIn(view);
    await waitFor(() => expect(hash()).toBe("/orders/new/repeat"));
    expect(client.net.calls.filter((c) => /[?&](x|t)=/.test(c.path))).toEqual([]);
  });

  test("#/accept-invite?t=abc signed out: nothing stored, sign-in goes to #/orders, t= never sent", async () => {
    const { client, deps } = await setup();
    await client.auth.signOut();
    await go("/accept-invite?t=abc");
    const view = render(React.createElement(App, { deps }));
    await waitFor(() => expect(deps.sessions.get().status).toBe("signed_out"));
    expect(deps.sessions.get().returnTo).toBeNull();
    await signIn(view);
    await waitFor(() => expect(hash()).toBe("/orders"));
    expect(client.net.calls.filter((c) => /[?&](x|t)=/.test(c.path))).toEqual([]);
  });
});
