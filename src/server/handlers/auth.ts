/**
 * src/server/handlers/auth.ts — sign-up, sign-in and sign-out over HTTP (C2; W3, W4, W6;
 * BR2.1–BR2.5, BR3.2, BR3.3, BR4.1, BR4.2, BR5.1–BR5.3).
 *
 * Each handler parses nothing itself (the pipeline has run the strict schema), calls one
 * domain function and maps its Result:
 * - sign-up → 201 with the C2 `Session` body and the session cookie; `invalid_email`,
 *   `password_too_short` (400, with the field named), `business_exists`, `email_taken`
 *   (409) and `rate_limited` (429) pass through unchanged (amendment A2);
 * - sign-in → 200 with the `Session` body and a new cookie, ending the session this browser
 *   presented; every failure is the identical 401 `invalid_credentials`, and a limited
 *   email gets 429 with the time left (BR4.1, BR4.2);
 * - sign-out → 204 and a clearing cookie, always — with no cookie, an unknown one, and
 *   (through the route's `clearCookieOnError`) even when the database is down (S3).
 * The locale is the shop's default, Bangla; there is no field for it (FR11).
 *
 * U3 (C6 with amendments B1, B4, B5; W2, W5, W6; S19, S21 as revised by D-01; NFR3.17,
 * NFR3.18, NFR5.9) adds the three public token and recovery routes. They are on the public
 * allow-list, and the pipeline still requires the exact Origin and a JSON content type on
 * them (NFR5.9):
 * - accept → 201 with the public user `{id, email, role, locale}` (B4) and the session cookie;
 *   `password_too_short` 400 naming `password` (B5), `gone` 410, `email_taken` 409,
 *   `rate_limited` 429 when the hash gate is full (B1);
 * - recover → 202 with an empty body, for every email: the handler is built without the
 *   database and without the hash gate, so it cannot look anything up (D-01, NFR3.18);
 * - reset → 204; `password_too_short` 400, `gone` 410, `rate_limited` 429. Every refused token
 *   — unknown, used, expired, or an inactive user's — is the identical `{error: "gone"}`
 *   (NFR3.17).
 */
import { acceptInvitation, type AcceptInvitationError } from "../../auth/accept-invite.js";
import { completeReset, type CompleteResetError } from "../../auth/password-reset.js";
import { toSessionView } from "../../auth/public-user.js";
import { recover } from "../../auth/recover.js";
import {
  AcceptInviteRequestSchema,
  RecoverRequestSchema,
  ResetRequestSchema,
  SignInRequestSchema,
  SignOutRequestSchema,
  SignUpRequestSchema,
  type AcceptInviteRequest,
  type RecoverRequest,
  type ResetRequest,
  type SignInRequest,
  type SignUpRequest,
} from "../../auth/schemas.js";
import { signIn } from "../../auth/sign-in.js";
import { signOut } from "../../auth/sign-out.js";
import { signUp, type SignUpError } from "../../auth/sign-up.js";
import { assertNever } from "../../data/assert-never.js";
import { clearSessionCookie, sessionCookie } from "../cookies.js";
import { defineRoute, type HandlerResult, type ServerDeps } from "../types.js";

const signUpFailure = (e: SignUpError): HandlerResult => {
  switch (e.kind) {
    case "invalid_email":
      return {
        kind: "error",
        error: "invalid_email",
        fields: [{ path: "email", message: e.kind }],
      };
    case "password_too_short":
      return {
        kind: "error",
        error: "password_too_short",
        fields: [{ path: "password", message: e.kind }],
      };
    case "invalid_input":
      return {
        kind: "error",
        error: "invalid_input",
        fields: [{ path: "businessName", message: e.message }],
      };
    case "business_exists":
    case "email_taken":
      return { kind: "error", error: e.kind };
    case "rate_limited":
      return { kind: "error", error: "rate_limited", retryAfterMs: e.retryAfterMs };
    default:
      return assertNever(e, "sign-up error");
  }
};

export const signUpRoute = defineRoute<Record<string, never>, Record<string, never>, SignUpRequest>(
  {
    method: "POST",
    path: "/api/auth/sign-up",
    access: "public",
    schemas: { body: SignUpRequestSchema },
    handler: async (ctx, deps) => {
      const r = await signUp(
        deps.sql,
        { ...ctx.body, locale: "bn" },
        { hashGate: deps.hashGate, correlationId: ctx.correlationId },
      );
      if (!r.ok) return signUpFailure(r.error);
      return {
        kind: "ok",
        status: 201,
        body: toSessionView(r.value.user, r.value.businessId),
        setCookie: sessionCookie(r.value.session.token, r.value.session.expiresAt, deps.clock()),
      };
    },
  },
);

export const signInRoute = defineRoute<Record<string, never>, Record<string, never>, SignInRequest>(
  {
    method: "POST",
    path: "/api/auth/sign-in",
    access: "public",
    schemas: { body: SignInRequestSchema },
    handler: async (ctx, deps) => {
      const r = await signIn(
        deps.sql,
        { email: ctx.body.email, password: ctx.body.password, presentedToken: ctx.presentedToken },
        { limiter: deps.limiter, hashGate: deps.hashGate, correlationId: ctx.correlationId },
      );
      if (!r.ok) {
        return r.error.kind === "rate_limited"
          ? { kind: "error", error: "rate_limited", retryAfterMs: r.error.retryAfterMs }
          : { kind: "error", error: "invalid_credentials" };
      }
      return {
        kind: "ok",
        status: 200,
        body: toSessionView(r.value.user, r.value.businessId),
        setCookie: sessionCookie(r.value.session.token, r.value.session.expiresAt, deps.clock()),
      };
    },
  },
);

export const signOutRoute = defineRoute<
  Record<string, never>,
  Record<string, never>,
  Record<string, never>
>({
  method: "POST",
  path: "/api/auth/sign-out",
  access: "public",
  schemas: { body: SignOutRequestSchema },
  clearCookieOnError: true,
  handler: async (ctx, deps) => {
    await signOut(deps.sql, ctx.presentedToken, ctx.correlationId);
    return { kind: "ok", status: 204, body: null, setCookie: clearSessionCookie() };
  },
});

/* ------------------------------------------------------------------ U3: tokens and recovery */

/** The token paths' deps: the shared hash gate, and the test hooks only when set (P-02). */
const tokenDeps = (deps: ServerDeps, correlationId: string) => ({
  hashGate: deps.hashGate,
  correlationId,
  ...(deps.hooks !== undefined ? { hooks: deps.hooks } : {}),
});

/** The refusals accept and reset share: one exhaustive mapping each (C1, B1, B5). */
const tokenFailure = (e: AcceptInvitationError | CompleteResetError): HandlerResult => {
  switch (e.kind) {
    case "password_too_short":
      return {
        kind: "error",
        error: "password_too_short",
        fields: [{ path: "password", message: e.kind }],
      };
    case "gone":
    case "email_taken":
      return { kind: "error", error: e.kind };
    case "rate_limited":
      return { kind: "error", error: "rate_limited", retryAfterMs: e.retryAfterMs };
    default:
      return assertNever(e, "token route error");
  }
};

export const acceptInviteRoute = defineRoute<
  Record<string, never>,
  Record<string, never>,
  AcceptInviteRequest
>({
  method: "POST",
  path: "/api/invitations/accept",
  access: "public",
  schemas: { body: AcceptInviteRequestSchema },
  handler: async (ctx, deps) => {
    const r = await acceptInvitation(
      deps.sql,
      {
        token: ctx.body.token,
        password: ctx.body.password,
        presentedToken: ctx.presentedToken,
        now: ctx.now,
      },
      tokenDeps(deps, ctx.correlationId),
    );
    if (!r.ok) return tokenFailure(r.error);
    return {
      kind: "ok",
      status: 201,
      body: r.value.user,
      setCookie: sessionCookie(r.value.session.token, r.value.session.expiresAt, ctx.now),
    };
  },
});

/** D-01: built without `deps` at all — no database, no hash gate (NFR3.18). */
export const recoverRoute = defineRoute<
  Record<string, never>,
  Record<string, never>,
  RecoverRequest
>({
  method: "POST",
  path: "/api/auth/recover",
  access: "public",
  schemas: { body: RecoverRequestSchema },
  handler: async (ctx) => {
    const outcome = recover(ctx.body);
    return { kind: "ok", status: outcome.status, body: null };
  },
});

export const resetRoute = defineRoute<Record<string, never>, Record<string, never>, ResetRequest>({
  method: "POST",
  path: "/api/auth/reset",
  access: "public",
  schemas: { body: ResetRequestSchema },
  handler: async (ctx, deps) => {
    const r = await completeReset(
      deps.sql,
      { token: ctx.body.token, password: ctx.body.password, now: ctx.now },
      tokenDeps(deps, ctx.correlationId),
    );
    if (!r.ok) return tokenFailure(r.error);
    // BR4.3, BR9.5: no new session; every session of the user has just ended.
    return { kind: "ok", status: 204, body: null };
  },
});
