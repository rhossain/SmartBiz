/**
 * src/server/handlers/staff.ts — the staff routes over HTTP (C6 with amendments B2, B3, B5;
 * U3 W1, W3, W7; BR1.1–BR1.3, BR2.1–BR2.5, BR4.1, BR10.1; S24; NFR1.10, NFR1.11, NFR3.19).
 *
 *   GET  /api/staff                       → 200 members, pending invitations, invitableRoles,
 *                                           canReset per member, truncated (B2)
 *   POST /api/staff/invitations           → 201 { invitation, link } — the link once (BR2.1)
 *   POST /api/staff/:userId/reset-links   → 201 { link, expiresAt } — the link once (BR4.1)
 *
 * All three have access `staff.invite`: the pipeline answers 401 without a session and 403
 * for Sales Staff and Accountants before a handler runs (BR1.1). The business and the acting
 * user come from the session the pipeline resolved on the server, never from the request
 * (team.md Code Style); the delegation matrix then refuses the finer pairs with 403
 * (BR1.2, BR1.3, NFR1.10). Each domain kind is mapped by one exhaustive switch and goes on
 * the wire unchanged: `invalid_email` 400 naming `email` (B5), `forbidden` 403, `not_found`
 * 404, `conflict` 409 (an existing member, B2.3; an inactive reset target, B3),
 * `db_unavailable` 503 after a second deadlock (D-03).
 *
 * The two `link` responses are the only bodies that carry a raw token (C5 link allow-list).
 * They are API responses, so the pipeline sets `Cache-Control: no-store` on them (S24,
 * NFR4.3); the logger redacts any `link` or `t` key, and the request line logs the route
 * pattern only, never the body (NFR3.19). Handlers log nothing themselves.
 */
import { createInvitation, listStaff, type InviteError } from "../../auth/invite.js";
import { createResetLink, type ResetLinkError } from "../../auth/password-reset.js";
import {
  InviteRequestSchema,
  ResetLinkParamsSchema,
  type InviteRequest,
  type ResetLinkParams,
} from "../../auth/schemas.js";
import type { ResolvedSession } from "../../auth/session.js";
import { assertNever } from "../../data/assert-never.js";
import type { Capability } from "../../data/enums.js";
import type { Actor } from "../../auth/delegation.js";
import { defineRoute, type HandlerResult, type ServerDeps } from "../types.js";

/** BR1.1, Q12: the capability every staff route needs (Owner and Manager). */
export const STAFF_ACCESS: ReadonlyArray<Capability> = ["staff.invite"];

const actorOf = (s: ResolvedSession): Actor => ({ id: s.userId, role: s.role });

const UNAUTHENTICATED: HandlerResult = { kind: "error", error: "unauthenticated" };

/** The write paths' optional deps: the correlation id, and the test hooks only when set. */
const writeDeps = (deps: ServerDeps, correlationId: string) => ({
  correlationId,
  ...(deps.hooks !== undefined ? { hooks: deps.hooks } : {}),
});

const inviteFailure = (e: InviteError): HandlerResult => {
  switch (e.kind) {
    case "invalid_email":
      return {
        kind: "error",
        error: "invalid_email",
        fields: [{ path: "email", message: e.kind }],
      };
    case "forbidden":
    case "conflict":
    case "db_unavailable":
      return { kind: "error", error: e.kind };
    default:
      return assertNever(e, "invite error");
  }
};

const resetLinkFailure = (e: ResetLinkError): HandlerResult => {
  switch (e.kind) {
    case "not_found":
    case "forbidden":
    case "conflict":
    case "db_unavailable":
      return { kind: "error", error: e.kind };
    default:
      return assertNever(e, "reset link error");
  }
};

export const staffListRoute = defineRoute({
  method: "GET",
  path: "/api/staff",
  access: STAFF_ACCESS,
  schemas: {},
  handler: async (ctx, deps) => {
    const s = ctx.session;
    if (s === null) return UNAUTHENTICATED;
    const list = await listStaff(deps.sql, {
      businessId: s.businessId,
      actor: actorOf(s),
      now: ctx.now,
    });
    return { kind: "ok", status: 200, body: list };
  },
});

export const inviteRoute = defineRoute<Record<string, never>, Record<string, never>, InviteRequest>(
  {
    method: "POST",
    path: "/api/staff/invitations",
    access: STAFF_ACCESS,
    schemas: { body: InviteRequestSchema },
    handler: async (ctx, deps) => {
      const s = ctx.session;
      if (s === null) return UNAUTHENTICATED;
      const r = await createInvitation(
        deps.sql,
        {
          businessId: s.businessId,
          actor: actorOf(s),
          email: ctx.body.email,
          role: ctx.body.role,
          now: ctx.now,
          port: deps.port,
        },
        writeDeps(deps, ctx.correlationId),
      );
      if (!r.ok) return inviteFailure(r.error);
      return { kind: "ok", status: 201, body: r.value };
    },
  },
);

export const resetLinkRoute = defineRoute<ResetLinkParams, Record<string, never>, undefined>({
  method: "POST",
  path: "/api/staff/:userId/reset-links",
  access: STAFF_ACCESS,
  schemas: { params: ResetLinkParamsSchema },
  handler: async (ctx, deps) => {
    const s = ctx.session;
    if (s === null) return UNAUTHENTICATED;
    const r = await createResetLink(
      deps.sql,
      {
        via: "staff",
        businessId: s.businessId,
        by: actorOf(s),
        targetUserId: ctx.params.userId,
        now: ctx.now,
        port: deps.port,
      },
      writeDeps(deps, ctx.correlationId),
    );
    if (!r.ok) return resetLinkFailure(r.error);
    return { kind: "ok", status: 201, body: { link: r.value.link, expiresAt: r.value.expiresAt } };
  },
});

/** BR10.1: the three staff routes, appended to the server's route table. */
export const staffRoutes = [staffListRoute, inviteRoute, resetLinkRoute] as const;
