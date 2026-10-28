/**
 * tests/unit/password-reset.test.ts — reset links and the reset on the SQL stub (U3 W3, W4,
 * W5; BR1.3, BR4.1–BR4.3, BR6.1, BR8.1; S19, S22; NFR3.21, NFR3.22, NFR3.24, NFR6.20,
 * NFR7.18; review F-03, F-04, E-01).
 *
 * Restated from the design:
 *   - staff link: unknown, foreign or non-UUID target → not_found; the Owner, oneself, or a
 *     Manager for a Manager → forbidden; an inactive target → conflict; nothing is written
 *     for any refusal;
 *   - terminal link: any ACTIVE user by email ignoring case, the Owner included; unknown or
 *     inactive → not_found and nothing written; the audit row has `by: null, via: terminal`;
 *   - a new link closes the user's other open links (F-03); 30 minutes; hash stored only;
 *   - lock order business → users (→ resets for the reset), audit before every write;
 *   - the reset: short password first (no SQL, no gate); unknown, used, expired or an
 *     inactive user → the same gone without hashing; a full gate → rate_limited with the
 *     token unused; success sets the hash, closes every open reset of the user and deletes
 *     EVERY session of the user, and no one else's;
 *   - valid at 30 minutes − 1 ms, gone exactly at 30 minutes;
 *   - a deadlock is retried once; a second answers gone (reset) or db_unavailable (link).
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { verifyPassword } from "../../src/auth/argon2.js";
import {
  completeReset,
  createResetLink,
  type ResetLinkError,
  type ResetLinkInput,
} from "../../src/auth/password-reset.js";
import { insertSession, resolveSession } from "../../src/auth/session.js";
import { sha256 } from "../../src/auth/sha256.js";
import { FROZEN_TEST_NOW, resetTestClock, setTestClock } from "../../src/data/clock.js";
import type { Role } from "../../src/data/enums.js";
import {
  fullGate,
  INACTIVE_ID,
  NEW_PASSWORD,
  spyGate,
  staffWorld,
  tokenOf,
  type StaffWorld,
} from "../helpers/staff-fixtures.js";

const NOW = new Date("2026-10-28T09:00:00.000Z");
const HALF_HOUR = 30 * 60 * 1000;

const staffLink = (w: StaffWorld, as: Role, targetUserId: string) =>
  createResetLink(w.stub.sql, {
    via: "staff",
    businessId: w.businessId,
    by: { id: w.id(as), role: as },
    targetUserId,
    now: NOW,
    port: 3000,
  });

const terminalLink = (w: StaffWorld, email: string) =>
  createResetLink(w.stub.sql, { via: "terminal", by: null, email, now: NOW, port: 3000 });

const reset = (
  w: StaffWorld,
  token: string,
  extra: Partial<{ now: Date; password: string }> = {},
  gate = spyGate(),
) =>
  completeReset(
    w.stub.sql,
    {
      token,
      password: extra.password ?? NEW_PASSWORD,
      now: extra.now ?? new Date(NOW.getTime() + 1000),
    },
    { hashGate: gate.gate },
  );

const openResets = (w: StaffWorld, userId: string) =>
  w.stub.state.passwordResets.filter((r) => r["user_id"] === userId && r["used_at"] === null);

beforeEach(() => setTestClock(FROZEN_TEST_NOW));
afterEach(() => resetTestClock());

describe("createResetLink — staff (W3)", () => {
  test("the Owner resets a Sales Staff member: link once, hash stored, 30 minutes, audit first", async () => {
    const w = await staffWorld();
    const target = w.id("sales_staff");
    const start = w.stub.calls.length;
    const r = await staffLink(w, "owner", target);
    if (!r.ok) throw new Error(r.error.kind);
    const token = tokenOf(r.value.link);
    expect(r.value.link).toBe(`http://127.0.0.1:3000/#/reset?t=${token}`);
    expect(r.value.expiresAt).toBe(new Date(NOW.getTime() + HALF_HOUR).toISOString());
    const [row] = openResets(w, target);
    expect(row?.["token_hash"]).toBe(await sha256(token));
    const audit = w.stub.state.auditLog.find((a) => a["action"] === "auth.reset_link_created");
    expect(JSON.parse(String(audit?.["payload"]))).toEqual({
      targetUserId: target,
      by: w.id("owner"),
      via: "staff",
    });
    const texts = w.stub.calls.slice(start).map((c) => c.text);
    const at = (re: RegExp): number => texts.findIndex((t) => re.test(t));
    const order = [
      /SELECT id FROM businesses WHERE id = \? FOR UPDATE/,
      /SELECT active FROM users WHERE id = \? FOR UPDATE/,
      /INSERT INTO audit_log/,
      /UPDATE password_resets SET used_at/,
      /INSERT INTO password_resets/,
    ].map(at);
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  test("a new link closes the user's other open links (F-03, NFR3.22)", async () => {
    const w = await staffWorld();
    const target = w.id("accountant");
    const first = await staffLink(w, "manager", target);
    const second = await staffLink(w, "owner", target);
    if (!first.ok || !second.ok) throw new Error("link failed");
    const open = openResets(w, target);
    expect(open.map((r) => r["token_hash"])).toEqual([await sha256(tokenOf(second.value.link))]);
    expect(await reset(w, tokenOf(first.value.link))).toEqual({
      ok: false,
      error: { kind: "gone" },
    });
  });

  test("delegation refusals and unknown targets write nothing (BR1.3)", async () => {
    const w = await staffWorld();
    const cases: Array<[Role, string, ResetLinkError["kind"]]> = [
      ["manager", w.id("owner"), "forbidden"],
      ["owner", w.id("owner"), "forbidden"],
      ["manager", w.id("manager"), "forbidden"],
      ["sales_staff", w.id("accountant"), "forbidden"],
      ["accountant", w.id("sales_staff"), "forbidden"],
      ["owner", "0f0f0f0f-0f0f-4f0f-8f0f-0f0f0f0f0f0f", "not_found"],
      ["owner", "not-a-uuid", "not_found"],
      ["owner", INACTIVE_ID, "conflict"],
    ];
    w.stub.state.users.push({
      id: "a8000000-0000-4000-8000-0000000000a1",
      business_id: "b0000000-0000-4000-8000-00000000000b",
      email: "elsewhere@other.test",
      password_hash: "x",
      role: "sales_staff",
      active: true,
      locale: "bn",
    });
    cases.push(["owner", "a8000000-0000-4000-8000-0000000000a1", "not_found"]);
    for (const [as, target, kind] of cases) {
      const r = await staffLink(w, as, target);
      expect({ as, target, r }).toEqual({ as, target, r: { ok: false, error: { kind } } });
    }
    expect(w.stub.state.passwordResets).toHaveLength(0);
    expect(w.stub.state.auditLog.some((a) => a["action"] === "auth.reset_link_created")).toBe(
      false,
    );
  });

  test("a deadlock is retried once; a second answers db_unavailable with nothing written", async () => {
    const twice = await staffWorld({
      faults: [{ match: /INSERT INTO password_resets/, code: "40P01", times: 2 }],
    });
    expect(await staffLink(twice, "owner", twice.id("manager"))).toEqual({
      ok: false,
      error: { kind: "db_unavailable" },
    });
    expect(twice.stub.state.passwordResets).toHaveLength(0);
    const once = await staffWorld({
      faults: [
        { match: /SELECT active FROM users WHERE id = \? FOR UPDATE/, code: "40001", times: 1 },
      ],
    });
    expect((await staffLink(once, "owner", once.id("manager"))).ok).toBe(true);
  });
});

describe("createResetLink — terminal (W4, BR6.1)", () => {
  test("any active user by email ignoring case, the Owner included; by null, via terminal", async () => {
    const w = await staffWorld();
    const r = await terminalLink(w, "  OWNER@acme.test ");
    if (!r.ok) throw new Error(r.error.kind);
    expect(r.value.userId).toBe(w.id("owner"));
    const audit = w.stub.state.auditLog.find((a) => a["action"] === "auth.reset_link_created");
    expect(audit?.["actor_user_id"]).toBeNull();
    expect(JSON.parse(String(audit?.["payload"]))).toEqual({
      targetUserId: w.id("owner"),
      by: null,
      via: "terminal",
    });
  });

  test("unknown or inactive: not_found, nothing written (NFR7.20)", async () => {
    const w = await staffWorld();
    for (const email of ["nobody@acme.test", "gone@acme.test"]) {
      expect(await terminalLink(w, email)).toEqual({ ok: false, error: { kind: "not_found" } });
    }
    expect(w.stub.state.passwordResets).toHaveLength(0);
    expect(w.stub.state.auditLog).toHaveLength(0);
  });
});

describe("completeReset (W5, S19)", () => {
  const linked = async (
    role: Role = "sales_staff",
    opts: Parameters<typeof staffWorld>[0] = {},
  ) => {
    const w = await staffWorld(opts);
    const userId = w.id(role);
    const r = await staffLink(w, "owner", userId);
    if (!r.ok) throw new Error(r.error.kind);
    return { w, userId, token: tokenOf(r.value.link) };
  };

  test("success: new hash, every open reset closed, every session of the user deleted, audit", async () => {
    const { w, userId, token } = await linked();
    const second = await insertSession(w.stub.sql, { userId, businessId: w.businessId, at: NOW });
    const ownerNow = await insertSession(w.stub.sql, {
      userId: w.id("owner"),
      businessId: w.businessId,
      at: NOW,
    });
    w.stub.state.passwordResets.push({
      id: "0d000000-0000-4000-8000-000000000001",
      user_id: userId,
      token_hash: "another-open-reset",
      expires_at: new Date(NOW.getTime() + HALF_HOUR).toISOString(),
      used_at: null,
    });
    const start = w.stub.calls.length;
    const r = await reset(w, token);
    expect(r).toEqual({ ok: true, value: { userId } });
    const user = w.stub.state.users.find((u) => u["id"] === userId);
    expect(await verifyPassword(String(user?.["password_hash"]), NEW_PASSWORD)).toBe(true);
    expect(openResets(w, userId)).toHaveLength(0);
    const later = new Date(NOW.getTime() + 2000);
    for (const t of [w.tokens.sales_staff, second.token]) {
      expect(await resolveSession(w.stub.sql, t, later)).toBeNull();
    }
    // Nobody else is signed out (BR4.3 is about this user only).
    expect(await resolveSession(w.stub.sql, ownerNow.token, later)).not.toBeNull();
    expect(w.stub.state.sessions.filter((s) => s["user_id"] === userId)).toHaveLength(0);
    const audit = w.stub.state.auditLog.find((a) => a["action"] === "auth.password_reset");
    expect(JSON.parse(String(audit?.["payload"]))).toEqual({ userId });
    // F-04, E-01: business → users → resets, audit before every write.
    const texts = w.stub.calls.slice(start).map((c) => c.text);
    const at = (re: RegExp): number => texts.findIndex((t) => re.test(t));
    const order = [
      /JOIN users u ON u\.id = r\.user_id/,
      /SELECT id FROM businesses WHERE id = \? FOR UPDATE/,
      /SELECT active FROM users WHERE id = \? FOR UPDATE/,
      /FROM password_resets\s+WHERE user_id = \? AND used_at IS NULL ORDER BY id FOR UPDATE/,
      /INSERT INTO audit_log/,
      /UPDATE users SET password_hash/,
      /UPDATE password_resets SET used_at/,
      /DELETE FROM sessions WHERE user_id = \?/,
    ].map(at);
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  test("a short password is refused first: no SQL, no hashing (BR3.4)", async () => {
    const { w, token } = await linked();
    const gate = spyGate();
    const start = w.stub.calls.length;
    expect(await reset(w, token, { password: "nine-char" }, gate)).toEqual({
      ok: false,
      error: { kind: "password_too_short" },
    });
    expect(w.stub.calls.length).toBe(start);
    expect(gate.calls()).toBe(0);
  });

  test("unknown, used, expired, inactive user: the same gone, no gate call (BR4.2, NFR6.20)", async () => {
    const { w, userId, token } = await linked();
    const gate = spyGate();
    const outcomes = [
      await reset(w, "C".repeat(43), {}, gate),
      await reset(w, "short", {}, gate),
      await reset(w, token, { now: new Date(NOW.getTime() + HALF_HOUR) }, gate),
    ];
    const user = w.stub.state.users.find((u) => u["id"] === userId);
    if (user) user["active"] = false;
    outcomes.push(await reset(w, token, {}, gate));
    if (user) user["active"] = true;
    expect((await reset(w, token)).ok).toBe(true);
    outcomes.push(await reset(w, token, {}, gate));
    for (const o of outcomes) expect(o).toEqual({ ok: false, error: { kind: "gone" } });
    expect(gate.calls()).toBe(0);
  });

  test("lifetime: valid at 30 minutes − 1 ms (NFR3.24)", async () => {
    const { w, token } = await linked();
    expect((await reset(w, token, { now: new Date(NOW.getTime() + HALF_HOUR - 1) })).ok).toBe(true);
  });

  test("a full gate answers rate_limited and the token stays usable (B1)", async () => {
    const { w, userId, token } = await linked();
    const r = await reset(w, token, {}, spyGate(fullGate()));
    expect(r.ok ? "ok" : r.error.kind).toBe("rate_limited");
    expect(openResets(w, userId)).toHaveLength(1);
    expect((await reset(w, token)).ok).toBe(true);
  });

  test("a deadlock is retried once; a second answers gone and changes nothing (NFR7.18)", async () => {
    const twice = await linked("accountant", {
      faults: [{ match: /DELETE FROM sessions WHERE user_id/, code: "40P01", times: 2 }],
    });
    const before = twice.w.stub.state.users.find((u) => u["id"] === twice.userId)?.[
      "password_hash"
    ];
    expect(await reset(twice.w, twice.token)).toEqual({ ok: false, error: { kind: "gone" } });
    expect(twice.w.stub.state.users.find((u) => u["id"] === twice.userId)?.["password_hash"]).toBe(
      before,
    );
    expect(openResets(twice.w, twice.userId)).toHaveLength(1);
    expect(twice.w.stub.state.auditLog.some((a) => a["action"] === "auth.password_reset")).toBe(
      false,
    );

    // Armed only after the link exists, so the deadlock hits the reset's own lock.
    const fault = { match: /FROM password_resets\s+WHERE user_id = \?/, code: "40P01", times: 0 };
    const once = await linked("accountant", { faults: [fault] });
    fault.times = 1;
    expect((await reset(once.w, once.token)).ok).toBe(true);
    expect(fault.times).toBe(0);
  });
});

describe("the staff and terminal inputs are one type (S25)", () => {
  test("a terminal input carries no staff actor", () => {
    const input: ResetLinkInput = { via: "terminal", by: null, email: "x@y.z", now: NOW, port: 1 };
    expect(input.by).toBeNull();
  });
});
