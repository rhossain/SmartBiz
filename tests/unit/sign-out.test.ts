/**
 * tests/unit/sign-out.test.ts — sign-out (W6; US1.4; BR5.1–BR5.3).
 *
 * Restated: the session behind the cookie is deleted and `auth.sign_out` (subject = the
 * user, empty payload, the correct action label) is written in the same transaction, only
 * when a row was deleted. No cookie, an unknown cookie or a second sign-out is quiet:
 * success, no audit row.
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { insertSession, resolveSession } from "../../src/auth/session.js";
import { signOut } from "../../src/auth/sign-out.js";
import { FROZEN_TEST_NOW, resetTestClock, setTestClock } from "../../src/data/clock.js";
import type { Uuid } from "../../src/data/uuid.js";
import { makeSqlStub } from "../helpers/sql-stub.js";

const USER = "a1000000-0000-4000-8000-0000000000a1" as Uuid;
const BUSINESS = "a0000000-0000-4000-8000-00000000000a" as Uuid;

const seeded = () =>
  makeSqlStub({
    users: [
      {
        id: USER,
        email: "o@x.test",
        role: "owner",
        active: true,
        locale: "bn",
        business_id: BUSINESS,
      },
    ],
    businesses: [{ id: BUSINESS, name: "A", owner_user_id: USER }],
  });

beforeEach(() => setTestClock(FROZEN_TEST_NOW));
afterEach(() => resetTestClock());

describe("sign-out (W6)", () => {
  test("a live session is deleted and auth.sign_out is written with no payload", async () => {
    const stub = seeded();
    const s = await insertSession(stub.sql, {
      userId: USER,
      businessId: BUSINESS,
      at: FROZEN_TEST_NOW,
    });
    const r = await signOut(stub.sql, s.token, "corr-1");
    expect(r).toEqual({ ok: true, value: { ended: true } });
    expect(stub.state.sessions).toHaveLength(0);
    expect(
      stub.state.auditLog.map((a) => [
        a["action"],
        a["subject_id"],
        JSON.parse(String(a["payload"])),
      ]),
    ).toEqual([["auth.sign_out", USER, {}]]);
    expect(stub.state.auditLog[0]?.["correlation_id"]).toBe("corr-1");
    expect(await resolveSession(stub.sql, s.token, FROZEN_TEST_NOW)).toBeNull();
  });

  test("no cookie: success, no query, no audit row", async () => {
    const stub = seeded();
    expect(await signOut(stub.sql, null)).toEqual({ ok: true, value: { ended: false } });
    expect(stub.calls).toHaveLength(0);
  });

  test("an unknown cookie: success, no audit row", async () => {
    const stub = seeded();
    expect(await signOut(stub.sql, "Q".repeat(43))).toEqual({ ok: true, value: { ended: false } });
    expect(stub.state.auditLog).toHaveLength(0);
  });

  test("signing out twice writes exactly one audit row (idempotent)", async () => {
    const stub = seeded();
    const s = await insertSession(stub.sql, {
      userId: USER,
      businessId: BUSINESS,
      at: FROZEN_TEST_NOW,
    });
    await signOut(stub.sql, s.token);
    const second = await signOut(stub.sql, s.token);
    expect(second).toEqual({ ok: true, value: { ended: false } });
    expect(stub.state.auditLog).toHaveLength(1);
  });

  test("the action is auth.sign_out, never the B1 mislabel auth.sign_in", async () => {
    const stub = seeded();
    const s = await insertSession(stub.sql, {
      userId: USER,
      businessId: BUSINESS,
      at: FROZEN_TEST_NOW,
    });
    await signOut(stub.sql, s.token);
    expect(stub.state.auditLog.some((a) => a["action"] === "auth.sign_in")).toBe(false);
  });
});
