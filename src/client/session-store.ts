/**
 * src/client/session-store.ts — who is signed in, in this tab (W9; BR8.1, BR8.6).
 *
 * A per-feature typed store from `createStateContainer` (team.md Code Style), never a global
 * object. It holds the session the server returned (`GET /api/session`, sign-in, sign-up),
 * a notice for the sign-in screen, and the route to return to. All of it is in memory only:
 * nothing about the session is written to localStorage, and the cookie is HttpOnly, so a
 * reload asks the server again (BR8.1 "held in memory only").
 *
 * W9: any 401 while signed in stores the current route, shows "আবার সাইন ইন করুন" and goes
 * to `#/sign-in`; after a successful sign-in the app goes back to the stored route, or to
 * `#/orders` when none is stored. Public routes are never stored as a return target, and
 * since U2 the stored route never carries a query string (S16).
 */
import { useSyncExternalStore } from "react";
import { createStateContainer, type StateContainer } from "../data/state-container.js";
import type { SessionResponse } from "../auth/schemas.js";

export const DEFAULT_RETURN_ROUTE = "/orders";

/** Routes that make no sense to come back to after signing in (U2: `/accept-invite`, Q2). */
const NOT_A_RETURN_TARGET: ReadonlySet<string> = new Set([
  "",
  "/",
  "/sign-in",
  "/sign-up",
  "/recover",
  "/reset",
  "/accept-invite",
  "/lock",
  "/not-found",
]);

export type SessionStatus = "unknown" | "signed_out" | "signed_in";
/**
 * What the sign-in screen says first: "আবার সাইন ইন করুন" after a session ended in use (W9),
 * or, since U3, "পাসওয়ার্ড বদলানো হয়েছে; …" after a completed reset (BR9.5).
 */
export type SessionNotice = "reauth" | "password_changed" | null;

export interface SessionState {
  readonly status: SessionStatus;
  readonly session: SessionResponse | null;
  readonly notice: SessionNotice;
  readonly returnTo: string | null;
}

export type SessionStore = StateContainer<SessionState>;

export const INITIAL_SESSION: SessionState = {
  status: "unknown",
  session: null,
  notice: null,
  returnTo: null,
};

export const createSessionStore = (initial: SessionState = INITIAL_SESSION): SessionStore =>
  createStateContainer<SessionState>(initial);

/**
 * U2 (S16, R9; D-01, F-06; NFR5.7, NFR7.12): the remembered route is the PATH only.
 * Everything from `?` is dropped, so a token in a query (`#/accept-invite?t=…`) is never
 * stored in memory and never resent after sign-in.
 */
const returnTarget = (route: string): string | null => {
  const path = route.split("?")[0] ?? "";
  return NOT_A_RETURN_TARGET.has(path) ? null : path;
};

/** Signed in: the server's session view; the notice and any return route are kept for `returnRoute`. */
export const signedIn = (store: SessionStore, session: SessionResponse): void =>
  store.update((s) => ({ ...s, status: "signed_in", session, notice: null }));

/** Signed out on purpose (sign-out) or on load: no notice, no return route. */
export const signedOut = (store: SessionStore): void =>
  store.set({ status: "signed_out", session: null, notice: null, returnTo: null });

/** Not signed in on load: remember where the person was heading, without the re-sign-in notice. */
export const needsSignIn = (store: SessionStore, currentRoute: string): void =>
  store.set({
    status: "signed_out",
    session: null,
    notice: null,
    returnTo: returnTarget(currentRoute),
  });

/** The gate sent a signed-out person to sign-in: remember the route, keep any notice. */
export const rememberRoute = (store: SessionStore, currentRoute: string): void => {
  const target = returnTarget(currentRoute);
  if (target !== null) store.update((s) => ({ ...s, returnTo: target }));
};

/** W9 step 1: a 401 in use. Remember the route, show the notice, go to sign-in. */
export const sessionEnded = (
  store: SessionStore,
  currentRoute: string,
  navigate: (to: string) => void,
): void => {
  store.set({
    status: "signed_out",
    session: null,
    notice: "reauth",
    returnTo: returnTarget(currentRoute) ?? store.get().returnTo,
  });
  navigate("/sign-in");
};

/**
 * U3 (W5, BR9.5): a reset succeeded. Every session of that person has ended on the server, so
 * this tab is signed out too, and sign-in opens with the password-changed notice.
 */
export const passwordChanged = (store: SessionStore): void =>
  store.set({ status: "signed_out", session: null, notice: "password_changed", returnTo: null });

/** W9 step 2: where to go after sign-in; clears the stored route so it is used once. */
export const returnRoute = (store: SessionStore): string => {
  const to = store.get().returnTo ?? DEFAULT_RETURN_ROUTE;
  store.update((s) => ({ ...s, returnTo: null }));
  return to;
};

export const useSession = (store: SessionStore): SessionState =>
  useSyncExternalStore(store.subscribe, store.get, store.get);
