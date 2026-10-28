/**
 * src/auth/invite.ts — invitations and the staff list (AuthComponent; U3 W1, W7; BR1.1,
 * BR1.2, BR2.1–BR2.5, BR8.1; S20, S22, S23; NFR1.10, NFR1.12, NFR3.23, NFR6.22, NFR7.15,
 * NFR7.17; review F-02, F-07, F-08, D-03).
 *
 * `createInvitation` (W1), in this order:
 *   1. the email is trimmed and lower-cased (F-08) and must look like an email
 *      (`invalid_email`, B5); the caller must be allowed to invite the role (BR1.2) — both
 *      before any SQL;
 *   2. a fresh 32-byte token is made; only its SHA-256 hex will be stored (BR2.1, S18);
 *   3. one transaction, retried once on a deadlock or serialisation failure (D-03):
 *        - lock the business row `FOR UPDATE` first. Every invite of the business queues
 *          here, so two invites for one email can never both find "no pending invitation"
 *          and both insert one (F-02, NFR7.17);
 *        - an email that already belongs to a user, active or not, ignoring case → 409
 *          `conflict` (BR2.3);
 *        - lock the pending invitations for that email (`FOR UPDATE`, after the business:
 *          the one lock order of every U3 transaction, D-03). A pending invitation whose
 *          role the caller could not issue → 403 (NFR1.12): a Manager may not replace an
 *          Owner's pending `manager` invitation;
 *        - write `auth.invite_created` first (BR8.1), then mark the pending ones used
 *          (supersede, BR2.4) and insert the new invitation, valid for 7 days (BR2.2);
 *   4. answer the public invitation and its link, once (C6 link_carve_out). No email is
 *      sent: the Owner or Manager copies the link by hand (NFR10.3).
 * A second deadlock answers `db_unavailable` (503): nothing was written and the caller may
 * simply try again. Any other database error is thrown (team.md).
 *
 * `listStaff` (W7): the members of the session's business and its pending invitations,
 * at most 200 of each with `truncated` beyond (BR2.5, NFR6.22), plus what the caller may do:
 * `invitableRoles` and each member's `canReset`, from the same delegation matrix the write
 * paths use (S20), so the screen never offers what the server would refuse.
 */
import type { Sql } from "../db/client.js";
import { isRetryableConflict, RETRY_CODES, withRetry } from "../db/retry.js";
import type { Role } from "../data/enums.js";
import { err, ok, type Result } from "../data/result.js";
import { uuid, type Uuid } from "../data/uuid.js";
import { auditInviteCreated } from "./audit.js";
import {
  canInvite,
  canResetTarget,
  canSupersede,
  INVITABLE,
  type Actor,
  type StaffRole,
} from "./delegation.js";
import { hashToken, INVITATION_TTL_MS, linkFor, newToken } from "./one-time-token.js";
import { isValidEmail } from "./sign-up.js";
import type { TxHooks } from "./types.js";

/** BR2.5, NFR6.22: at most this many members and invitations per answer. */
export const STAFF_LIST_LIMIT = 200;

export type InviteError =
  | { readonly kind: "invalid_email" }
  | { readonly kind: "forbidden" }
  | { readonly kind: "conflict" }
  | { readonly kind: "db_unavailable" };

export interface InviteInput {
  /** From the session, never the request (BR3.8). */
  readonly businessId: Uuid;
  readonly actor: Actor;
  readonly email: string;
  readonly role: StaffRole;
  readonly now: Date;
  /** The server's port, for the link (C6 link_format). */
  readonly port: number;
}

export interface WriteDeps {
  readonly correlationId?: string;
  /** Test-only pause points (P-02); production never passes them. */
  readonly hooks?: TxHooks;
}

/** A pending invitation as the staff screen sees it (C6, entities.md StaffList). */
export interface PendingInvitation {
  readonly id: Uuid;
  readonly email: string;
  readonly role: StaffRole;
  readonly expiresAt: string;
}

export interface InviteOutput {
  readonly invitation: PendingInvitation;
  /** The raw link, returned once and never stored (BR2.1). */
  readonly link: string;
}

/** F-08: invite emails are stored and compared trimmed and lower-cased. */
export const normaliseEmail = (email: string): string => email.trim().toLowerCase();

const toIso = (v: Date | string): string => new Date(v).toISOString();

export const createInvitation = async (
  sql: Sql,
  input: InviteInput,
  deps: WriteDeps = {},
): Promise<Result<InviteOutput, InviteError>> => {
  const email = normaliseEmail(input.email);
  if (!isValidEmail(email)) return err({ kind: "invalid_email" });
  if (!canInvite(input.actor.role, input.role)) return err({ kind: "forbidden" });

  const token = newToken();
  const tokenHash = await hashToken(token);
  const id = uuid();
  const at = input.now.toISOString();
  const expiresAt = new Date(input.now.getTime() + INVITATION_TTL_MS).toISOString();
  await deps.hooks?.beforeTransaction?.();
  try {
    const written = await withRetry(1, RETRY_CODES, () =>
      sql.begin(async (tx): Promise<Result<true, InviteError>> => {
        // D-03, F-02: the business row first; every invite of this business waits here.
        await tx`SELECT id FROM businesses WHERE id = ${input.businessId} FOR UPDATE`;
        await deps.hooks?.afterLock?.();
        // BR2.3: a user with this email, active or not, ignoring case, is already a member.
        const member = await tx`SELECT id FROM users WHERE lower(email) = ${email} LIMIT 1`;
        if (member.length > 0) return err({ kind: "conflict" });
        const pending = await tx<{ id: string; role: Role }[]>`
          SELECT id, role FROM invitations
          WHERE business_id = ${input.businessId} AND lower(email) = ${email}
            AND used_at IS NULL AND expires_at > ${at}::timestamptz
          ORDER BY id FOR UPDATE
        `;
        // NFR1.12: only an invitation the caller could have issued may be replaced.
        if (pending.some((p) => !canSupersede(input.actor.role, p.role))) {
          return err({ kind: "forbidden" });
        }
        await auditInviteCreated(
          tx,
          { businessId: input.businessId, correlationId: deps.correlationId },
          { invitationId: id, role: input.role, by: input.actor.id },
        );
        // BR2.4: the older link stops working (410) the moment this one exists.
        for (const p of pending) {
          await tx`UPDATE invitations SET used_at = ${at}::timestamptz WHERE id = ${p.id}`;
        }
        await tx`
          INSERT INTO invitations (
            id, business_id, email, role, accept_token_hash, expires_at, used_at, created_by, created_at
          ) VALUES (
            ${id}, ${input.businessId}, ${email}, ${input.role}, ${tokenHash},
            ${expiresAt}::timestamptz, NULL, ${input.actor.id}, ${at}::timestamptz
          )
        `;
        return ok(true);
      }),
    );
    if (!written.ok) return written;
  } catch (e: unknown) {
    // D-03: a second deadlock is 503; nothing was written and the caller may try again.
    if (isRetryableConflict(e)) return err({ kind: "db_unavailable" });
    throw e;
  }
  return ok({
    invitation: { id, email, role: input.role, expiresAt },
    link: linkFor("accept-invite", token, input.port),
  });
};

/** One member of the business as the staff screen sees it (entities.md StaffMember). */
export interface StaffMember {
  readonly id: Uuid;
  readonly email: string;
  readonly role: Role;
  readonly active: boolean;
  /** BR1.3: may the caller create a reset link for this member right now? */
  readonly canReset: boolean;
}

export interface StaffList {
  readonly members: ReadonlyArray<StaffMember>;
  readonly invitations: ReadonlyArray<PendingInvitation>;
  readonly invitableRoles: ReadonlyArray<StaffRole>;
  readonly truncated: boolean;
}

export interface StaffListInput {
  readonly businessId: Uuid;
  readonly actor: Actor;
  readonly now: Date;
}

export const listStaff = async (sql: Sql, input: StaffListInput): Promise<StaffList> => {
  const take = STAFF_LIST_LIMIT + 1;
  const members = await sql<{ id: string; email: string; role: Role; active: boolean }[]>`
    SELECT id, email, role, active FROM users
    WHERE business_id = ${input.businessId}
    ORDER BY CASE role WHEN 'owner' THEN 0 WHEN 'manager' THEN 1 WHEN 'sales_staff' THEN 2 ELSE 3 END,
      lower(email), id
    LIMIT ${take}
  `;
  const invitations = await sql<
    { id: string; email: string; role: StaffRole; expires_at: Date | string }[]
  >`
    SELECT id, email, role, expires_at FROM invitations
    WHERE business_id = ${input.businessId} AND used_at IS NULL
      AND expires_at > ${input.now.toISOString()}::timestamptz
    ORDER BY expires_at, id
    LIMIT ${take}
  `;
  return {
    members: members.slice(0, STAFF_LIST_LIMIT).map((m) => ({
      id: m.id as Uuid,
      email: m.email,
      role: m.role,
      active: m.active,
      // An inactive member answers 409 on a reset link (BR1.3), so the button is not offered.
      canReset: m.active && canResetTarget(input.actor, m),
    })),
    invitations: invitations.slice(0, STAFF_LIST_LIMIT).map((i) => ({
      id: i.id as Uuid,
      email: i.email,
      role: i.role,
      expiresAt: toIso(i.expires_at),
    })),
    invitableRoles: INVITABLE[input.actor.role],
    truncated: members.length > STAFF_LIST_LIMIT || invitations.length > STAFF_LIST_LIMIT,
  };
};
