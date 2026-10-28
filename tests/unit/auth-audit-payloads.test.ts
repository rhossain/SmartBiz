/**
 * tests/unit/auth-audit-payloads.test.ts — no email, token, link or hash in any U3 audit
 * payload (U3 BR8.1; NFR3.20; review F-07; team.md "no PII in audit rows").
 *
 * audit_log is insert-only and kept five years, so anything written there can never be
 * erased. The four U3 flows run end to end on the SQL stub — an invitation, its acceptance, a
 * staff reset link, a terminal reset link and the reset — and every payload they write is
 * restated against BR8.1's key sets and searched for an `@` and for any key named `email`,
 * the raw tokens and their hashes. Each helper also builds its payload from named fields
 * only, so a caller that passes more (an email, say) cannot leak it.
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { acceptInvitation } from "../../src/auth/accept-invite.js";
import {
  auditInviteAccepted,
  auditInviteCreated,
  auditPasswordReset,
  auditResetLinkCreated,
} from "../../src/auth/audit.js";
import { createInvitation } from "../../src/auth/invite.js";
import { completeReset, createResetLink } from "../../src/auth/password-reset.js";
import { sha256 } from "../../src/auth/sha256.js";
import { FROZEN_TEST_NOW, resetTestClock, setTestClock } from "../../src/data/clock.js";
import type { Uuid } from "../../src/data/uuid.js";
import { authDeps } from "../helpers/auth-fixtures.js";
import { NEW_PASSWORD, staffWorld, tokenOf } from "../helpers/staff-fixtures.js";

const NOW = new Date("2026-10-28T09:00:00.000Z");

/** Every key name anywhere in a JSON value. */
const keysOf = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.flatMap(keysOf);
  if (value === null || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([k, v]) => [k, ...keysOf(v)]);
};

beforeEach(() => setTestClock(FROZEN_TEST_NOW));
afterEach(() => resetTestClock());

describe("U3 audit payloads (BR8.1, NFR3.20)", () => {
  test("the four actions, run end to end, carry exactly BR8.1's keys and no email or secret", async () => {
    const w = await staffWorld();
    const owner = { id: w.id("owner"), role: "owner" as const };
    const inv = await createInvitation(w.stub.sql, {
      businessId: w.businessId,
      actor: owner,
      email: "Invitee@Shop.test",
      role: "sales_staff",
      now: NOW,
      port: 3000,
    });
    if (!inv.ok) throw new Error(inv.error.kind);
    const inviteToken = tokenOf(inv.value.link);
    const acc = await acceptInvitation(
      w.stub.sql,
      { token: inviteToken, password: NEW_PASSWORD, presentedToken: null, now: NOW },
      authDeps(),
    );
    if (!acc.ok) throw new Error(acc.error.kind);
    const staffLink = await createResetLink(w.stub.sql, {
      via: "staff",
      businessId: w.businessId,
      by: owner,
      targetUserId: acc.value.user.id,
      now: NOW,
      port: 3000,
    });
    const terminal = await createResetLink(w.stub.sql, {
      via: "terminal",
      by: null,
      email: "invitee@shop.test",
      now: NOW,
      port: 3000,
    });
    if (!staffLink.ok || !terminal.ok) throw new Error("reset link");
    const resetToken = tokenOf(terminal.value.link);
    const done = await completeReset(
      w.stub.sql,
      { token: resetToken, password: `${NEW_PASSWORD}-2`, now: NOW },
      authDeps(),
    );
    expect(done.ok).toBe(true);

    const rows = w.stub.state.auditLog.map((a) => ({
      action: a["action"],
      payload: JSON.parse(String(a["payload"])) as Record<string, unknown>,
    }));
    expect(rows.map((r) => [r.action, Object.keys(r.payload).sort()])).toEqual([
      ["auth.invite_created", ["by", "invitationId", "role"]],
      ["auth.invite_accepted", ["invitationId", "role", "userId"]],
      ["auth.reset_link_created", ["by", "targetUserId", "via"]],
      ["auth.reset_link_created", ["by", "targetUserId", "via"]],
      ["auth.password_reset", ["userId"]],
    ]);
    expect(rows.map((r) => r.payload["via"]).filter(Boolean)).toEqual(["staff", "terminal"]);
    const text = JSON.stringify(w.stub.state.auditLog);
    expect(text.includes("@")).toBe(false);
    expect(keysOf(rows).filter((k) => /email/i.test(k))).toEqual([]);
    const secrets = [
      inviteToken,
      resetToken,
      await sha256(inviteToken),
      await sha256(resetToken),
      NEW_PASSWORD,
    ];
    for (const s of secrets)
      expect({ s, present: text.includes(s) }).toEqual({ s, present: false });
  });

  test("each helper writes only its named fields, whatever the caller passes (F-07)", async () => {
    const w = await staffWorld();
    const id = "d3000000-0000-4000-8000-0000000000d3" as Uuid;
    const extra = { email: "leak@shop.test", token: "raw-token-value" };
    const ctx = { businessId: w.businessId };
    await auditInviteCreated(w.stub.sql, ctx, {
      invitationId: id,
      role: "manager",
      by: id,
      ...extra,
    });
    await auditInviteAccepted(w.stub.sql, ctx, {
      invitationId: id,
      role: "manager",
      userId: id,
      ...extra,
    });
    await auditResetLinkCreated(w.stub.sql, ctx, {
      targetUserId: id,
      by: null,
      via: "terminal",
      ...extra,
    });
    await auditPasswordReset(w.stub.sql, ctx, { userId: id, ...extra });
    const text = JSON.stringify(w.stub.state.auditLog);
    expect(text.includes("@")).toBe(false);
    expect(text.includes("raw-token-value")).toBe(false);
    for (const a of w.stub.state.auditLog) {
      expect(keysOf(JSON.parse(String(a["payload"])))).not.toContain("email");
    }
  });
});
