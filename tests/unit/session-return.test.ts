/**
 * tests/unit/session-return.test.ts — W9 in the client (BR8.1).
 *
 * Restated: a 401 in use stores the current route (in memory), shows the re-sign-in notice
 * and goes to `#/sign-in`; after sign-in the app returns to that route once, or to
 * `#/orders` when none was stored; public routes are never stored as a return target;
 * signing out on purpose clears everything.
 */
import { describe, expect, test } from "bun:test";
import {
  createSessionStore,
  DEFAULT_RETURN_ROUTE,
  needsSignIn,
  returnRoute,
  sessionEnded,
  signedIn,
  signedOut,
} from "../../src/client/session-store.js";
import type { SessionResponse } from "../../src/auth/schemas.js";

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
