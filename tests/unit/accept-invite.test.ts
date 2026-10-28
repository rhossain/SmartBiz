/**
 * tests/unit/accept-invite.test.ts — accepting an invitation on the SQL stub (U3 W2;
 * BR3.1–BR3.5, BR8.1; S19; NFR1.9, NFR3.17, NFR3.23, NFR3.24, NFR6.20, NFR6.23, NFR7.18,
 * NFR7.21; review F-01, F-02, F-08, P-02, D-03).
 *
 * Restated from the design (S19):
 *   - a short password is refused before anything else — no SQL, no hashing;
 *   - an unknown, malformed, used or expired token answers the same `gone` WITHOUT calling the
 *     hash gate, even when the gate is full; a valid token with a full gate answers
 *     `rate_limited` and the token stays unused;
 *   - the transaction locks the business, then the invitation, writes the audit row first,
 *     then the user — whose business and role come from the invitation, never the request;
 *   - a unique violation on `users_email_lower_unique_idx` is `email_taken` (the invitation
 *     stays unused); any other database error is thrown;
 *   - after commit the presented session is deleted and a new one is created;
 *   - an invitation is valid until 7 days; exactly at the limit it is gone.
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { acceptInvitation } from "../../src/auth/accept-invite.js";
import { createHashGate, type HashGate } from "../../src/auth/hash-gate.js";
import { createInvitation } from "../../src/auth/invite.js";
import { insertSession, resolveSession } from "../../src/auth/session.js";
import { FROZEN_TEST_NOW, resetTestClock, setTestClock } from "../../src/data/clock.js";
import { verifyPassword } from "../../src/auth/argon2.js";
import {
  fullGate,
  NEW_PASSWORD,
  spyGate,
  staffWorld,
  tokenOf,
  type StaffWorld,
} from "../helpers/staff-fixtures.js";

const NOW = new Date("2026-10-28T09:00:00.000Z");
const WEEK = 7 * 24 * 60 * 60 * 1000;

/** A world with one pending sales_staff invitation for `new@acme.test`; returns its token. */
const invited = async (
  opts: Parameters<typeof staffWorld>[0] = {},
): Promise<{ w: StaffWorld; token: string; invitationId: string }> => {
  const w = await staffWorld(opts);
  const r = await createInvitation(w.stub.sql, {
    businessId: w.businessId,
    actor: { id: w.id("owner"), role: "owner" },
    email: "new@acme.test",
    role: "sales_staff",
    now: NOW,
    port: 3000,
  });
  if (!r.ok) throw new Error(r.error.kind);
  return { w, token: tokenOf(r.value.link), invitationId: r.value.invitation.id };
};

const accept = (
  w: StaffWorld,
  token: string,
  extra: Partial<{ now: Date; presentedToken: string | null; password: string }> = {},
  gate = spyGate(),
) =>
  acceptInvitation(
    w.stub.sql,
    {
      token,
      password: extra.password ?? NEW_PASSWORD,
      presentedToken: extra.presentedToken ?? null,
      now: extra.now ?? new Date(NOW.getTime() + 1000),
    },
    { hashGate: gate.gate },
  );

beforeEach(() => setTestClock(FROZEN_TEST_NOW));
afterEach(() => resetTestClock());

describe("acceptInvitation (W2, S19)", () => {
  test("a valid token creates the user in the invitation's business and role, signed in", async () => {
    const { w, token, invitationId } = await invited();
    const r = await accept(w, token);
    if (!r.ok) throw new Error(r.error.kind);
    expect(r.value.user).toEqual({
      id: r.value.user.id,
      email: "new@acme.test",
      role: "sales_staff",
      locale: "bn",
    });
    expect(r.value.businessId).toBe(w.businessId);
    const user = w.stub.state.users.find((u) => u["id"] === r.value.user.id);
    expect(user?.["business_id"]).toBe(w.businessId);
    expect(await verifyPassword(String(user?.["password_hash"]), NEW_PASSWORD)).toBe(true);
    expect(
      w.stub.state.invitations.find((i) => i["id"] === invitationId)?.["used_at"],
    ).not.toBeNull();
    const audit = w.stub.state.auditLog.find((a) => a["action"] === "auth.invite_accepted");
    expect(JSON.parse(String(audit?.["payload"]))).toEqual({
      invitationId,
      role: "sales_staff",
      userId: r.value.user.id,
    });
    const s = await resolveSession(
      w.stub.sql,
      r.value.session.token,
      new Date(NOW.getTime() + 2000),
    );
    expect(s?.userId).toBe(r.value.user.id);
  });

  test("order: business lock, invitation lock, audit, user insert, mark used (D-03, BR8.1)", async () => {
    const { w, token } = await invited();
    const start = w.stub.calls.length;
    await accept(w, token);
    const texts = w.stub.calls.slice(start).map((c) => c.text);
    const at = (re: RegExp): number => texts.findIndex((t) => re.test(t));
    const order = [
      /WHERE accept_token_hash = \?/,
      /SELECT id FROM businesses WHERE id = \? FOR UPDATE/,
      /FROM invitations WHERE id = \? FOR UPDATE/,
      /INSERT INTO audit_log/,
      /INSERT INTO users/,
      /UPDATE invitations SET used_at/,
    ].map(at);
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  test("the role and business come from the invitation, never the request (NFR1.9)", async () => {
    const { w, token } = await invited();
    const smuggled = {
      token,
      password: NEW_PASSWORD,
      presentedToken: null,
      now: new Date(NOW.getTime() + 1000),
      role: "manager",
      businessId: "0f0f0f0f-0f0f-4f0f-8f0f-0f0f0f0f0f0f",
    };
    const r = await acceptInvitation(w.stub.sql, smuggled, { hashGate: spyGate().gate });
    if (!r.ok) throw new Error(r.error.kind);
    expect(r.value.user.role).toBe("sales_staff");
    const user = w.stub.state.users.find((u) => u["id"] === r.value.user.id);
    expect([user?.["role"], user?.["business_id"]]).toEqual(["sales_staff", w.businessId]);
  });

  test("a short password is refused first: no SQL, no hashing (BR3.4)", async () => {
    const { w, token } = await invited();
    const gate = spyGate();
    const start = w.stub.calls.length;
    expect(await accept(w, token, { password: "short-9ch" }, gate)).toEqual({
      ok: false,
      error: { kind: "password_too_short" },
    });
    expect(w.stub.calls.length).toBe(start);
    expect(gate.calls()).toBe(0);
  });

  test("unknown, malformed, used and expired tokens: the same gone, no gate call (BR3.2, NFR6.20)", async () => {
    const { w, token } = await invited();
    const gate = spyGate();
    // A well-formed token that was never issued.
    const unknown = "A".repeat(43);
    const outcomes = [
      await accept(w, unknown, {}, gate),
      await accept(w, "not-a-token", {}, gate),
      await accept(w, token, { now: new Date(NOW.getTime() + WEEK) }, gate),
    ];
    const used = await accept(w, token);
    expect(used.ok).toBe(true);
    outcomes.push(await accept(w, token, {}, gate));
    for (const o of outcomes) expect(o).toEqual({ ok: false, error: { kind: "gone" } });
    expect(gate.calls()).toBe(0);
  });

  test("lifetime: valid at 7 days − 1 ms, gone exactly at 7 days (NFR3.24)", async () => {
    const late = await invited();
    expect(await accept(late.w, late.token, { now: new Date(NOW.getTime() + WEEK) })).toEqual({
      ok: false,
      error: { kind: "gone" },
    });
    const inTime = await invited();
    const r = await accept(inTime.w, inTime.token, { now: new Date(NOW.getTime() + WEEK - 1) });
    expect(r.ok).toBe(true);
  });

  test("a full gate: unknown token → gone; valid token → rate_limited, token unused (B1)", async () => {
    const { w, token, invitationId } = await invited();
    const gate = spyGate(fullGate());
    expect(await accept(w, `${"B".repeat(43)}`, {}, gate)).toEqual({
      ok: false,
      error: { kind: "gone" },
    });
    expect(gate.calls()).toBe(0);
    const r = await accept(w, token, {}, gate);
    expect(r.ok ? "ok" : r.error.kind).toBe("rate_limited");
    expect(gate.calls()).toBe(1);
    expect(w.stub.state.invitations.find((i) => i["id"] === invitationId)?.["used_at"]).toBeNull();
    expect(w.stub.state.users.some((u) => u["email"] === "new@acme.test")).toBe(false);
  });

  test("the email became a user meanwhile: email_taken, invitation unused (BR3.3, NFR7.21)", async () => {
    const { w, token, invitationId } = await invited();
    w.stub.state.users.push({
      id: "a7000000-0000-4000-8000-0000000000a1",
      business_id: w.businessId,
      email: "NEW@acme.test",
      password_hash: "x",
      role: "accountant",
      active: true,
      locale: "bn",
    });
    expect(await accept(w, token)).toEqual({ ok: false, error: { kind: "email_taken" } });
    expect(w.stub.state.invitations.find((i) => i["id"] === invitationId)?.["used_at"]).toBeNull();
    expect(w.stub.state.auditLog.some((a) => a["action"] === "auth.invite_accepted")).toBe(false);
  });

  test("a unique violation on another constraint is rethrown, not email_taken (NFR7.21)", async () => {
    const { w, token } = await invited({
      faults: [
        { match: /INSERT INTO users/, code: "23505", times: 1, constraint_name: "users_pkey" },
      ],
    });
    await expect(accept(w, token)).rejects.toMatchObject({
      code: "23505",
      constraint_name: "users_pkey",
    });
  });

  test("a deadlock is retried once; a second answers gone with nothing written (NFR7.18)", async () => {
    const once = await invited({
      faults: [{ match: /FROM invitations WHERE id = \? FOR UPDATE/, code: "40P01", times: 1 }],
    });
    expect((await accept(once.w, once.token)).ok).toBe(true);
    const twice = await invited({
      faults: [{ match: /INSERT INTO users/, code: "40P01", times: 2 }],
    });
    expect(await accept(twice.w, twice.token)).toEqual({ ok: false, error: { kind: "gone" } });
    expect(twice.w.stub.state.users.some((u) => u["email"] === "new@acme.test")).toBe(false);
    expect(twice.w.stub.state.invitations.every((i) => i["used_at"] === null)).toBe(true);
  });

  test("the session this browser presented is deleted; a new one is created (F-08)", async () => {
    const { w, token } = await invited();
    const presented = (
      await insertSession(w.stub.sql, {
        userId: w.id("accountant"),
        businessId: w.businessId,
        at: NOW,
      })
    ).token;
    const later = new Date(NOW.getTime() + 2000);
    expect(await resolveSession(w.stub.sql, presented, later)).not.toBeNull();
    const r = await accept(w, token, { presentedToken: presented });
    if (!r.ok) throw new Error(r.error.kind);
    expect(await resolveSession(w.stub.sql, presented, later)).toBeNull();
    expect(await resolveSession(w.stub.sql, r.value.session.token, later)).not.toBeNull();
  });

  test(
    "30 parallel accepts share the gate: ≤ 2 hashes at once, 429 beyond the queue, those tokens unused (NFR6.23)",
    async () => {
      const w = await staffWorld();
      const tokens: string[] = [];
      for (let i = 0; i < 30; i++) {
        const r = await createInvitation(w.stub.sql, {
          businessId: w.businessId,
          actor: { id: w.id("owner"), role: "owner" },
          email: `p${i}@acme.test`,
          role: "accountant",
          now: NOW,
          port: 3000,
        });
        if (!r.ok) throw new Error(r.error.kind);
        tokens.push(tokenOf(r.value.link));
      }
      // The shared gate (2 permits, queue 20), wrapped to measure how many hashes overlap.
      const inner = createHashGate();
      let running = 0;
      let peak = 0;
      const gate: HashGate = {
        run: (work) =>
          inner.run(async () => {
            running += 1;
            peak = Math.max(peak, running);
            try {
              return await work();
            } finally {
              running -= 1;
            }
          }),
        inFlight: inner.inFlight,
        waiting: inner.waiting,
      };
      const results = await Promise.all(
        tokens.map((token) =>
          acceptInvitation(
            w.stub.sql,
            {
              token,
              password: NEW_PASSWORD,
              presentedToken: null,
              now: new Date(NOW.getTime() + 1000),
            },
            { hashGate: gate },
          ),
        ),
      );
      const kinds = results.map((r) => (r.ok ? "ok" : r.error.kind));
      expect(peak).toBeLessThanOrEqual(2);
      expect(kinds.filter((k) => k === "ok")).toHaveLength(22);
      expect(kinds.filter((k) => k === "rate_limited")).toHaveLength(8);
      expect(w.stub.state.invitations.filter((i) => i["used_at"] === null)).toHaveLength(8);
    },
    { timeout: 60_000 },
  );
});
