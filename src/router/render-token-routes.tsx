/**
 * src/router/render-token-routes.tsx — the containers of `/accept-invite`, `/reset` and
 * `/recover` (U3 W2, W5, W6; BR7.1, BR9.3–BR9.5; S24; NFR5.8; review D-01, D-02).
 *
 * The screens under src/router/screens/ take props only and may not import the client
 * (BR7.4). These containers live outside `screens/` so they may: they own the staff client
 * calls, the token and the navigation that follows success.
 *
 * The token (BR7.1, NFR5.8, scenario S10): a link is `…/#/accept-invite?t=<token>` or
 * `…/#/reset?t=<token>`. On mount the container reads `t` from the address bar ONCE into a
 * `useRef`, and its first effect calls `history.replaceState` to `#/accept-invite` (or
 * `#/reset`) — before this screen sends any request — so the token leaves the address bar
 * and the history entry. It lives only in that ref: never in state that renders, never in
 * storage, never in a URL (the token goes in the POST body, src/client/staff-api.ts), never
 * logged. App's session probe on load runs before this container mounts; it is a fixed URL
 * without the fragment, and browsers never send a fragment anyway.
 *
 * After success:
 *   - accept (201, signed in by the cookie): App refreshes the session and the app opens the
 *     orders list (BR9.5);
 *   - reset (204, every session of the person ended): this tab is signed out and sign-in
 *     opens with "পাসওয়ার্ড বদলানো হয়েছে; নতুন পাসওয়ার্ড দিয়ে সাইন ইন করুন" (BR9.5);
 *   - recover (202): the neutral sentence, for every answer and every failure (BR9.4); an
 *     email that is not an email is refused here, before anything is sent.
 */
import * as React from "react";
import { isValidEmail } from "../auth/schemas.js";
import type { ApiFailure } from "../client/http.js";
import type { StaffApi } from "../client/staff-api.js";
import { AcceptScreen } from "./screens/Accept.js";
import { RecoverScreen, type RecoverOutcomeView } from "./screens/Recover.js";
import { ResetScreen } from "./screens/Reset.js";

/** What App hands the three public token routes. */
export interface TokenRouteState {
  readonly kind: "token";
  readonly staff: StaffApi;
  /** After a 201 from accept: load the session the new cookie carries (App). */
  readonly onAccepted: () => Promise<void>;
  /** After a 204 from reset: this tab is signed out, with the password-changed notice. */
  readonly onPasswordChanged: () => void;
  /**
   * The hash router's `navigate`, passed in by App: importing hash-router here would close an
   * import cycle (hash-router → routes → this module). Where to go is decided here.
   */
  readonly navigate: (to: string) => void;
}

export const isTokenRouteState = (state: unknown): state is TokenRouteState =>
  typeof state === "object" && state !== null && (state as { kind?: unknown }).kind === "token";

export type LinkPath = "/accept-invite" | "/reset";

/** The `t` of a raw hash such as `#/reset?t=abc`, or null when there is none. */
export const readToken = (hash: string): string | null => {
  const q = hash.indexOf("?");
  if (q < 0) return null;
  const t = new URLSearchParams(hash.slice(q + 1)).get("t");
  return t === null || t === "" ? null : t;
};

/** Read the token once into a ref; drop it from the address bar in the first effect. */
const useLinkToken = (
  path: LinkPath,
): { readonly token: React.MutableRefObject<string | null>; readonly hasToken: boolean } => {
  const token = React.useRef<string | null>(null);
  const [hasToken] = React.useState(() => {
    token.current = readToken(window.location.hash);
    return token.current !== null;
  });
  // BR7.1, S24: the first effect, before this screen sends any request.
  React.useEffect(() => {
    window.history.replaceState(null, "", `#${path}`);
  }, [path]);
  return { token, hasToken };
};

const AcceptInviteRoute = ({ state }: { readonly state: TokenRouteState }): React.ReactElement => {
  const { token, hasToken } = useLinkToken("/accept-invite");
  const onSubmit = async (password: string): Promise<ApiFailure | null> => {
    const r = await state.staff.accept({ token: token.current ?? "", password });
    if (!r.ok) return r;
    token.current = null;
    await state.onAccepted();
    state.navigate("/orders");
    return null;
  };
  return <AcceptScreen hasToken={hasToken} onSubmit={onSubmit} />;
};

const ResetRoute = ({ state }: { readonly state: TokenRouteState }): React.ReactElement => {
  const { token, hasToken } = useLinkToken("/reset");
  const onSubmit = async (password: string): Promise<ApiFailure | null> => {
    const r = await state.staff.reset({ token: token.current ?? "", password });
    if (!r.ok) return r;
    token.current = null;
    state.onPasswordChanged();
    state.navigate("/sign-in");
    return null;
  };
  return <ResetScreen hasToken={hasToken} onSubmit={onSubmit} />;
};

const RecoverRoute = ({ state }: { readonly state: TokenRouteState }): React.ReactElement => {
  const onSubmit = async (email: string): Promise<RecoverOutcomeView> => {
    const normalised = email.trim().toLowerCase();
    if (!isValidEmail(normalised)) return "invalid_email";
    // BR9.4: whatever the answer — 202, an error or no network — the same sentence.
    await state.staff.recover({ email: normalised });
    return "done";
  };
  return <RecoverScreen onSubmit={onSubmit} />;
};

export const renderAcceptInvite = (state: unknown): React.ReactElement | null =>
  isTokenRouteState(state) ? <AcceptInviteRoute state={state} /> : null;

export const renderReset = (state: unknown): React.ReactElement | null =>
  isTokenRouteState(state) ? <ResetRoute state={state} /> : null;

export const renderRecover = (state: unknown): React.ReactElement | null =>
  isTokenRouteState(state) ? <RecoverRoute state={state} /> : null;
