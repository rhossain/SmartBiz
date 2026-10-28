/**
 * src/router/screens/render-auth-route.tsx — wires the public routes to their screens
 * (W3, W4, W9; US1.2, US1.3; U2 BR1.1, BR4.1).
 *
 *   /sign-in    → SignInScreen (with the W9 notice when a session ended in use)
 *   /sign-up    → SignUpScreen (first run only; the app routes here from GET /api/setup)
 *   /lock       → the role-lock screen (a capability the role lacks, or a 403); U2: it names
 *                 the feature the person tried to open and links to the role's first screen
 *                 when App passes them in `lock` (BR4.1)
 *   /not-found  → "পাওয়া যায়নি"
 *   U2: every route whose feature is not built in this intent → the not-available screen
 *   naming the feature (`renderNotAvailable`; BR1.1).
 *
 * Like render-orders-route.tsx, the router hands `render` its state as `unknown`; sign-in and
 * sign-up render only from an `AuthRouteState` and nothing from foreign state. Lock,
 * not-found and not-available need no state of their own, so they render whatever they are
 * given (the lock uses `lock` when the state carries it).
 */
import * as React from "react";
import type { SessionResponse, SignInRequest, SignUpRequest } from "../../auth/schemas.js";
import type { ApiResult } from "../../client/http.js";
import type { SessionNotice } from "../../client/session-store.js";
import type { LKey } from "../../i18n/L.js";
import { LockScreen } from "../../pres/Lock.js";
import { NotAvailableScreen } from "../../pres/NotAvailable.js";
import { NotFoundScreen } from "../../pres/NotFound.js";
import { SignInScreen } from "./SignIn.js";
import { SignUpScreen } from "./SignUp.js";

/** What the lock screen names and where its link goes (BR4.1); App fills it on a redirect. */
export interface LockInfo {
  readonly feature: string | null;
  readonly homeTo: string | null;
}

export interface AuthRouteState {
  readonly kind: "auth";
  readonly notice: SessionNotice;
  readonly signIn: (input: SignInRequest) => Promise<ApiResult<SessionResponse>>;
  readonly signUp: (input: SignUpRequest) => Promise<ApiResult<SessionResponse>>;
  readonly onSignedIn: (session: SessionResponse) => void;
  readonly lock?: LockInfo;
}

export const isAuthRouteState = (state: unknown): state is AuthRouteState =>
  typeof state === "object" && state !== null && (state as { kind?: unknown }).kind === "auth";

export const renderSignIn = (state: unknown): React.ReactElement | null =>
  isAuthRouteState(state) ? (
    <SignInScreen signIn={state.signIn} onSignedIn={state.onSignedIn} notice={state.notice} />
  ) : null;

export const renderSignUp = (state: unknown): React.ReactElement | null =>
  isAuthRouteState(state) ? (
    <SignUpScreen signUp={state.signUp} onSignedIn={state.onSignedIn} />
  ) : null;

export const renderLock = (state?: unknown): React.ReactElement => {
  const lock = isAuthRouteState(state) ? state.lock : undefined;
  return <LockScreen feature={lock?.feature ?? null} homeTo={lock?.homeTo ?? null} />;
};

export const renderNotFound = (): React.ReactElement => <NotFoundScreen />;

/** BR1.1: a feature not built in this intent still renders a real, named screen. */
export const renderNotAvailable = (featureKey: LKey): (() => React.ReactElement) => {
  const NotAvailableRoute = (): React.ReactElement => (
    <NotAvailableScreen featureKey={featureKey} />
  );
  return NotAvailableRoute;
};
