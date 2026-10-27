/**
 * src/router/screens/render-auth-route.tsx — wires U1's public routes to their screens
 * (W3, W4, W9; US1.2, US1.3).
 *
 *   /sign-in    → SignInScreen (with the W9 notice when a session ended in use)
 *   /sign-up    → SignUpScreen (first run only; the app routes here from GET /api/setup)
 *   /lock       → the role-lock screen (a capability the role lacks, or a 403)
 *   /not-found  → "পাওয়া যায়নি"
 *
 * Like render-orders-route.tsx, the router hands `render` its state as `unknown`; sign-in and
 * sign-up render only from an `AuthRouteState` and nothing from foreign state. Lock and
 * not-found need no state at all, so they render whatever they are given.
 */
import * as React from "react";
import type { SessionResponse, SignInRequest, SignUpRequest } from "../../auth/schemas.js";
import type { ApiResult } from "../../client/http.js";
import type { SessionNotice } from "../../client/session-store.js";
import { LockScreen } from "../../pres/Lock.js";
import { NotFoundScreen } from "../../pres/NotFound.js";
import { SignInScreen } from "./SignIn.js";
import { SignUpScreen } from "./SignUp.js";

export interface AuthRouteState {
  readonly kind: "auth";
  readonly notice: SessionNotice;
  readonly signIn: (input: SignInRequest) => Promise<ApiResult<SessionResponse>>;
  readonly signUp: (input: SignUpRequest) => Promise<ApiResult<SessionResponse>>;
  readonly onSignedIn: (session: SessionResponse) => void;
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

export const renderLock = (): React.ReactElement => <LockScreen />;

export const renderNotFound = (): React.ReactElement => <NotFoundScreen />;
