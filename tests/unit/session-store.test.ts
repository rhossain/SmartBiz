/**
 * tests/unit/session-store.test.ts — the session store against the SQL stub (BR3.1, BR3.4,
 * BR3.5, BR3.6; NFR3.2, NFR3.3).
 *
 * The limits are restated inline: valid while now < issued + 30 days AND now < lastSeen +
 * 12 hours AND the user is active. Exactly 12 hours idle is already invalid. The stub reads
 * the comparison operators from the SQL text, so loosening `>` to `>=` fails here.
 */
import { describe, expect, test } from "bun:test";
import { deleteSessionByToken, insertSession, resolveSession } from "../../src/auth/session.js";
import { sha256 } from "../../src/auth/sha256.js";
import type { Uuid } from "../../src/data/uuid.js";
import { makeSqlStub } from "../helpers/sql-stub.js";

const USER = "a1000000-0000-4000-8000-0000000000a1" as Uuid;
const BUSINESS = "a0000000-0000-4000-8000-00000000000a" as Uuid;
const T0 = new Date("2026-10-27T09:00:00.000Z");
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const stubWithUser = (active = true): ReturnType<typeof makeSqlStub> =>
  makeSqlStub({
    users: [
      {
        id: USER,
        email: "owner@example.com",
        password_hash: "x",
        role: "owner",
        active,
        locale: "bn",
        business_id: BUSINESS,
      },
    ],
  });

const at = (ms: number): Date => new Date(T0.getTime() + ms);

describe("session store", () => {
  test("insert stores only the SHA-256 of the token, never the token itself", async () => {
    const stub = stubWithUser();
    const s = await insertSession(stub.sql, { userId: USER, businessId: BUSINESS, at: T0 });
    expect(stub.state.sessions.length).toBe(1);
    expect(stub.state.sessions[0]?.["token_hash"]).toBe(await sha256(s.token));
    const everyParam = stub.calls.flatMap((c) => c.params.map(String));
    expect(everyParam.some((p) => p.includes(s.token))).toBe(false);
    expect(s.expiresAt.getTime()).toBe(T0.getTime() + 30 * DAY);
  });

  test("resolve returns the user, business and role from the rows", async () => {
    const stub = stubWithUser();
    const s = await insertSession(stub.sql, { userId: USER, businessId: BUSINESS, at: T0 });
    const r = await resolveSession(stub.sql, s.token, at(HOUR));
    expect(r).toMatchObject({ userId: USER, businessId: BUSINESS, role: "owner", locale: "bn" });
  });

  test("12 h − 1 ms idle is valid; exactly 12 h idle is invalid (BR3.5)", async () => {
    const a = stubWithUser();
    const sa = await insertSession(a.sql, { userId: USER, businessId: BUSINESS, at: T0 });
    expect(await resolveSession(a.sql, sa.token, at(12 * HOUR - 1))).not.toBeNull();
    const b = stubWithUser();
    const sb = await insertSession(b.sql, { userId: USER, businessId: BUSINESS, at: T0 });
    expect(await resolveSession(b.sql, sb.token, at(12 * HOUR))).toBeNull();
  });

  test("use moves the idle window, but never past the 30-day cap (BR3.4)", async () => {
    const stub = stubWithUser();
    const s = await insertSession(stub.sql, { userId: USER, businessId: BUSINESS, at: T0 });
    // Used every 11 hours: each resolve succeeds and moves lastSeenAt.
    let t = 0;
    while (t + 11 * HOUR < 30 * DAY) {
      t += 11 * HOUR;
      expect({ t, ok: (await resolveSession(stub.sql, s.token, at(t))) !== null }).toEqual({
        t,
        ok: true,
      });
    }
    expect(await resolveSession(stub.sql, s.token, at(30 * DAY - 1))).not.toBeNull();
    expect(await resolveSession(stub.sql, s.token, at(30 * DAY))).toBeNull();
  });

  test("an inactive user's session is invalid", async () => {
    const stub = stubWithUser(false);
    const s = await insertSession(stub.sql, { userId: USER, businessId: BUSINESS, at: T0 });
    expect(await resolveSession(stub.sql, s.token, at(1))).toBeNull();
  });

  test("a malformed or unknown token resolves to nothing, malformed without a query", async () => {
    const stub = stubWithUser();
    const before = stub.calls.length;
    expect(await resolveSession(stub.sql, "not-a-token", T0)).toBeNull();
    expect(stub.calls.length).toBe(before);
    expect(await resolveSession(stub.sql, "A".repeat(43), T0)).toBeNull();
  });

  test("delete removes the row and says whose it was; a second delete finds nothing", async () => {
    const stub = stubWithUser();
    const s = await insertSession(stub.sql, { userId: USER, businessId: BUSINESS, at: T0 });
    expect(await deleteSessionByToken(stub.sql, s.token)).toEqual({
      userId: USER,
      businessId: BUSINESS,
    });
    expect(stub.state.sessions.length).toBe(0);
    expect(await deleteSessionByToken(stub.sql, s.token)).toBeNull();
    expect(await resolveSession(stub.sql, s.token, at(1))).toBeNull();
  });
});
