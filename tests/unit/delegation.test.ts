/**
 * tests/unit/delegation.test.ts — the delegation matrix over every caller × role and caller
 * × target pair (U3 S20; BR1.1–BR1.3; NFR1.10, NFR1.12; functional-design Q1, F-02, F-03).
 *
 * The expected matrix is RESTATED here from functional-spec.md "Delegation matrix", not read
 * from src/auth/delegation.ts, so the code is never tested against itself:
 *   invite      owner → manager, sales_staff, accountant; manager → sales_staff, accountant;
 *               sales_staff, accountant → nothing; owner is never invitable;
 *   reset link  never the Owner, never oneself; owner → any other member; manager →
 *               sales_staff and accountant; sales_staff, accountant → nobody;
 *   supersede   only an invitation the caller could have issued.
 * The domain paths are checked too: a Manager superseding a pending `manager` invitation and
 * a self-reset both answer 403, and the staff list's `invitableRoles` / `canReset` agree.
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { canInvite, canResetTarget, canSupersede, INVITABLE } from "../../src/auth/delegation.js";
import { createInvitation, listStaff } from "../../src/auth/invite.js";
import { createResetLink } from "../../src/auth/password-reset.js";
import { FROZEN_TEST_NOW, resetTestClock, setTestClock } from "../../src/data/clock.js";
import type { Role } from "../../src/data/enums.js";
import type { Uuid } from "../../src/data/uuid.js";
import { staffWorld } from "../helpers/staff-fixtures.js";

const ROLES: ReadonlyArray<Role> = ["owner", "manager", "sales_staff", "accountant"];

const MAY_INVITE: Readonly<Record<Role, ReadonlyArray<Role>>> = {
  owner: ["manager", "sales_staff", "accountant"],
  manager: ["sales_staff", "accountant"],
  sales_staff: [],
  accountant: [],
};

const MAY_RESET: Readonly<Record<Role, ReadonlyArray<Role>>> = {
  owner: ["manager", "sales_staff", "accountant"],
  manager: ["sales_staff", "accountant"],
  sales_staff: [],
  accountant: [],
};

const CALLER = "d1000000-0000-4000-8000-0000000000d1" as Uuid;
const OTHER = "d2000000-0000-4000-8000-0000000000d2" as Uuid;
const NOW = new Date("2026-10-28T09:00:00.000Z");

beforeEach(() => setTestClock(FROZEN_TEST_NOW));
afterEach(() => resetTestClock());

describe("delegation matrix (S20)", () => {
  test("invite: every caller × role pair (BR1.2, NFR1.10)", () => {
    for (const caller of ROLES) {
      for (const role of ROLES) {
        const expected = MAY_INVITE[caller].includes(role);
        expect({ caller, role, may: canInvite(caller, role) }).toEqual({
          caller,
          role,
          may: expected,
        });
      }
      const roles: ReadonlyArray<Role> = INVITABLE[caller];
      expect({ caller, roles }).toEqual({ caller, roles: MAY_INVITE[caller] });
    }
  });

  test("reset link: every caller × target role, and never oneself (BR1.3)", () => {
    for (const caller of ROLES) {
      for (const target of ROLES) {
        const expected = MAY_RESET[caller].includes(target);
        const may = canResetTarget({ id: CALLER, role: caller }, { id: OTHER, role: target });
        expect({ caller, target, may }).toEqual({ caller, target, may: expected });
        const self = canResetTarget({ id: CALLER, role: caller }, { id: CALLER, role: target });
        expect({ caller, target, self }).toEqual({ caller, target, self: false });
      }
    }
  });

  test("supersede: only a pending invitation the caller could have issued (NFR1.12)", () => {
    for (const caller of ROLES) {
      for (const pending of ["manager", "sales_staff", "accountant"] as const) {
        const expected = MAY_INVITE[caller].includes(pending);
        expect({ caller, pending, may: canSupersede(caller, pending) }).toEqual({
          caller,
          pending,
          may: expected,
        });
      }
    }
  });

  test("domain: a Manager superseding a pending manager invitation is 403 (NFR1.12)", async () => {
    const w = await staffWorld();
    const base = { businessId: w.businessId, email: "lead@acme.test", now: NOW, port: 3000 };
    const owners = await createInvitation(w.stub.sql, {
      ...base,
      actor: { id: w.id("owner"), role: "owner" },
      role: "manager",
    });
    expect(owners.ok).toBe(true);
    const managers = await createInvitation(w.stub.sql, {
      ...base,
      actor: { id: w.id("manager"), role: "manager" },
      role: "accountant",
    });
    expect(managers).toEqual({ ok: false, error: { kind: "forbidden" } });
    expect(w.stub.state.invitations.filter((i) => i["used_at"] === null)).toHaveLength(1);
  });

  test("domain: a self-reset is 403 for every role that may reset at all (BR1.3)", async () => {
    const w = await staffWorld();
    for (const caller of ["owner", "manager"] as const) {
      const r = await createResetLink(w.stub.sql, {
        via: "staff",
        businessId: w.businessId,
        by: { id: w.id(caller), role: caller },
        targetUserId: w.id(caller),
        now: NOW,
        port: 3000,
      });
      expect({ caller, r }).toEqual({ caller, r: { ok: false, error: { kind: "forbidden" } } });
    }
  });

  test("the staff list says exactly what the matrix allows (S20: screen and server agree)", async () => {
    const w = await staffWorld();
    for (const caller of ROLES) {
      const list = await listStaff(w.stub.sql, {
        businessId: w.businessId,
        actor: { id: w.id(caller), role: caller },
        now: NOW,
      });
      const invitable: ReadonlyArray<Role> = list.invitableRoles;
      expect({ caller, invitable }).toEqual({
        caller,
        invitable: MAY_INVITE[caller],
      });
      for (const m of list.members) {
        const expected = m.active && m.id !== w.id(caller) && MAY_RESET[caller].includes(m.role);
        expect({ caller, member: m.email, canReset: m.canReset }).toEqual({
          caller,
          member: m.email,
          canReset: expected,
        });
      }
    }
  });
});
