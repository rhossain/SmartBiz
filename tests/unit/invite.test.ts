/**
 * tests/unit/invite.test.ts — invitations and the staff list on the SQL stub (U3 W1, W7;
 * BR1.2, BR2.1–BR2.5, BR8.1; S20, S22, S23; NFR1.10, NFR1.12, NFR3.23, NFR6.22, NFR7.18;
 * review F-02, F-08, D-03).
 *
 * Restated from the design:
 *   - refusals that need no database come first: a bad email (`invalid_email`) and a role
 *     the caller may not invite (`forbidden`) issue no SQL at all;
 *   - the business row is locked first, then the member check, then the pending invitations
 *     of the email; `auth.invite_created` is written before the invitation row (audit-first);
 *   - the email is trimmed and lower-cased on store; a member (active or not) with the same
 *     email ignoring case is 409; a pending invitation for the email is superseded (marked
 *     used) unless it carries a role the caller could not issue (403, pending kept);
 *   - only the token's SHA-256 is stored; the link carries the raw token; 7 days;
 *   - a deadlock is retried once; a second answers `db_unavailable` with nothing written;
 *   - the staff list is the business's members in role order and its pending invitations,
 *     at most 200 each with `truncated`, plus `invitableRoles` and `canReset` per member.
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createInvitation, listStaff, STAFF_LIST_LIMIT } from "../../src/auth/invite.js";
import { sha256 } from "../../src/auth/sha256.js";
import { FROZEN_TEST_NOW, resetTestClock, setTestClock } from "../../src/data/clock.js";
import type { Role } from "../../src/data/enums.js";
import type { Uuid } from "../../src/data/uuid.js";
import { staffWorld, tokenOf, type StaffWorld } from "../helpers/staff-fixtures.js";

const NOW = new Date("2026-10-28T09:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;

const invite = (
  w: StaffWorld,
  as: Role,
  email: string,
  role: "manager" | "sales_staff" | "accountant",
) =>
  createInvitation(
    w.stub.sql,
    {
      businessId: w.businessId,
      actor: { id: w.id(as), role: as },
      email,
      role,
      now: NOW,
      port: 3000,
    },
    {},
  );

const statementIndex = (w: StaffWorld, re: RegExp): number =>
  w.stub.calls.findIndex((c) => re.test(c.text));

beforeEach(() => setTestClock(FROZEN_TEST_NOW));
afterEach(() => resetTestClock());

describe("createInvitation (W1)", () => {
  test("the Owner invites: link once, hash stored, 7 days, lower-cased email, audit first", async () => {
    const w = await staffWorld();
    const before = w.stub.calls.length;
    const r = await invite(w, "owner", "  Ali@Shop.BD ", "sales_staff");
    if (!r.ok) throw new Error(r.error.kind);
    const token = tokenOf(r.value.link);
    expect(r.value.link).toBe(`http://127.0.0.1:3000/#/accept-invite?t=${token}`);
    expect(r.value.invitation).toEqual({
      id: r.value.invitation.id,
      email: "ali@shop.bd",
      role: "sales_staff",
      expiresAt: new Date(NOW.getTime() + 7 * DAY).toISOString(),
    });
    const [row] = w.stub.state.invitations;
    expect(row?.["email"]).toBe("ali@shop.bd");
    expect(row?.["accept_token_hash"]).toBe(await sha256(token));
    expect(JSON.stringify(w.stub.state.invitations)).not.toContain(token);
    const audit = w.stub.state.auditLog.find((a) => a["action"] === "auth.invite_created");
    expect(JSON.parse(String(audit?.["payload"]))).toEqual({
      invitationId: r.value.invitation.id,
      role: "sales_staff",
      by: w.id("owner"),
    });
    // D-03: business lock, member check, pending lock, audit, insert — in this order.
    const order = [
      /SELECT id FROM businesses WHERE id = \? FOR UPDATE/,
      /SELECT id FROM users WHERE lower\(email\) = \?/,
      /SELECT id, role FROM invitations[\s\S]*FOR UPDATE/,
      /INSERT INTO audit_log/,
      /INSERT INTO invitations/,
    ].map((re) => statementIndex(w, re));
    expect(order.every((i) => i >= before)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  test("a bad email and a role the caller may not invite issue no SQL (B5, BR1.2)", async () => {
    const w = await staffWorld();
    const before = w.stub.calls.length;
    const bad = await invite(w, "owner", "not-an-email", "sales_staff");
    expect(bad).toEqual({ ok: false, error: { kind: "invalid_email" } });
    const managerMintsManager = await invite(w, "manager", "m2@acme.test", "manager");
    expect(managerMintsManager).toEqual({ ok: false, error: { kind: "forbidden" } });
    const sales = await invite(w, "sales_staff", "x@acme.test", "accountant");
    expect(sales).toEqual({ ok: false, error: { kind: "forbidden" } });
    expect(w.stub.calls.length).toBe(before);
  });

  test("an existing member, active or not, ignoring case, is 409 and nothing is written (BR2.3)", async () => {
    const w = await staffWorld();
    for (const email of ["SALES_STAFF@acme.test", "gone@ACME.test"]) {
      const r = await invite(w, "owner", email, "accountant");
      expect({ email, r }).toEqual({ email, r: { ok: false, error: { kind: "conflict" } } });
    }
    expect(w.stub.state.invitations).toHaveLength(0);
    expect(w.stub.state.auditLog.filter((a) => a["action"] === "auth.invite_created")).toHaveLength(
      0,
    );
  });

  test("a new invitation supersedes the pending one for the same email (BR2.4)", async () => {
    const w = await staffWorld();
    const first = await invite(w, "manager", "new@acme.test", "sales_staff");
    const second = await invite(w, "owner", "NEW@acme.test", "accountant");
    if (!first.ok || !second.ok) throw new Error("invite failed");
    const rows = w.stub.state.invitations;
    expect(rows.find((i) => i["id"] === first.value.invitation.id)?.["used_at"]).toBe(
      NOW.toISOString(),
    );
    expect(rows.filter((i) => i["used_at"] === null).map((i) => i["id"])).toEqual([
      second.value.invitation.id,
    ]);
  });

  test("a Manager cannot supersede a pending manager invitation: 403, it stays (NFR1.12)", async () => {
    const w = await staffWorld();
    const owners = await invite(w, "owner", "lead@acme.test", "manager");
    if (!owners.ok) throw new Error("invite failed");
    const r = await invite(w, "manager", "lead@acme.test", "sales_staff");
    expect(r).toEqual({ ok: false, error: { kind: "forbidden" } });
    expect(w.stub.state.invitations.map((i) => [i["id"], i["used_at"]])).toEqual([
      [owners.value.invitation.id, null],
    ]);
  });

  test("a deadlock is retried once; a second answers db_unavailable with nothing written", async () => {
    const once = await staffWorld({
      faults: [
        { match: /SELECT id FROM businesses WHERE id = \? FOR UPDATE/, code: "40P01", times: 1 },
      ],
    });
    expect((await invite(once, "owner", "a@acme.test", "accountant")).ok).toBe(true);
    expect(once.stub.state.invitations).toHaveLength(1);

    const twice = await staffWorld({
      faults: [{ match: /INSERT INTO invitations/, code: "40001", times: 2 }],
    });
    expect(await invite(twice, "owner", "a@acme.test", "accountant")).toEqual({
      ok: false,
      error: { kind: "db_unavailable" },
    });
    expect(twice.stub.state.invitations).toHaveLength(0);
    expect(
      twice.stub.state.auditLog.filter((a) => a["action"] === "auth.invite_created"),
    ).toHaveLength(0);
  });

  test("any other database error is thrown, never turned into an outcome", async () => {
    const w = await staffWorld({
      faults: [{ match: /INSERT INTO invitations/, code: "23514", times: 1 }],
    });
    await expect(invite(w, "owner", "a@acme.test", "accountant")).rejects.toMatchObject({
      code: "23514",
    });
  });

  test("the hooks run before the transaction and after the business lock (P-02)", async () => {
    const w = await staffWorld();
    const seen: string[] = [];
    const r = await createInvitation(
      w.stub.sql,
      {
        businessId: w.businessId,
        actor: { id: w.id("owner"), role: "owner" },
        email: "h@acme.test",
        role: "accountant",
        now: NOW,
        port: 3000,
      },
      {
        hooks: {
          beforeTransaction: async () => {
            seen.push(`before:${w.stub.calls.length}`);
          },
          afterLock: async () => {
            seen.push(`after:${w.stub.calls.at(-1)?.text.trim().slice(0, 30)}`);
          },
        },
      },
    );
    expect(r.ok).toBe(true);
    expect(seen.map((s) => s.split(":")[0])).toEqual(["before", "after"]);
    expect(seen[1]).toBe("after:SELECT id FROM businesses WHER");
  });
});

describe("listStaff (W7)", () => {
  test("members in role order with canReset; pending invitations only; invitableRoles (BR2.5)", async () => {
    const w = await staffWorld();
    await invite(w, "owner", "p1@acme.test", "manager");
    w.stub.state.invitations.push(
      {
        id: "0b000000-0000-4000-8000-000000000001",
        business_id: w.businessId,
        email: "old@acme.test",
        role: "accountant",
        accept_token_hash: "h-old",
        expires_at: NOW.toISOString(),
        used_at: null,
      },
      {
        id: "0b000000-0000-4000-8000-000000000002",
        business_id: w.businessId,
        email: "used@acme.test",
        role: "accountant",
        accept_token_hash: "h-used",
        expires_at: new Date(NOW.getTime() + DAY).toISOString(),
        used_at: NOW.toISOString(),
      },
    );
    const asManager = await listStaff(w.stub.sql, {
      businessId: w.businessId,
      actor: { id: w.id("manager"), role: "manager" },
      now: NOW,
    });
    expect(asManager.members.map((m) => [m.role, m.email, m.active, m.canReset])).toEqual([
      ["owner", "owner@acme.test", true, false],
      ["manager", "manager@acme.test", true, false],
      ["sales_staff", "gone@acme.test", false, false],
      ["sales_staff", "sales_staff@acme.test", true, true],
      ["accountant", "accountant@acme.test", true, true],
    ]);
    expect(asManager.invitations.map((i) => i.email)).toEqual(["p1@acme.test"]);
    expect(asManager.invitableRoles).toEqual(["sales_staff", "accountant"]);
    expect(asManager.truncated).toBe(false);
    expect(JSON.stringify(asManager)).not.toMatch(/password|hash/i);

    const asOwner = await listStaff(w.stub.sql, {
      businessId: w.businessId,
      actor: { id: w.id("owner"), role: "owner" },
      now: NOW,
    });
    expect(asOwner.invitableRoles).toEqual(["manager", "sales_staff", "accountant"]);
    expect(asOwner.members.filter((m) => m.canReset).map((m) => m.role)).toEqual([
      "manager",
      "sales_staff",
      "accountant",
    ]);
  });

  test("201 rows of each: 200 answered and truncated (NFR6.22)", async () => {
    const w = await staffWorld();
    for (let i = 0; i < STAFF_LIST_LIMIT + 1; i++) {
      const n = String(i).padStart(4, "0");
      w.stub.state.invitations.push({
        id: `0c000000-0000-4000-8000-00000000${n}` as Uuid,
        business_id: w.businessId,
        email: `inv${n}@acme.test`,
        role: "accountant",
        accept_token_hash: `h${n}`,
        expires_at: new Date(NOW.getTime() + DAY + i).toISOString(),
        used_at: null,
      });
    }
    const r = await listStaff(w.stub.sql, {
      businessId: w.businessId,
      actor: { id: w.id("owner"), role: "owner" },
      now: NOW,
    });
    expect(r.invitations).toHaveLength(STAFF_LIST_LIMIT);
    expect(r.invitations[0]?.email).toBe("inv0000@acme.test");
    expect(r.truncated).toBe(true);
  });
});
