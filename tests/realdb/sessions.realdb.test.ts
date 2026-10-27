/**
 * tests/realdb/sessions.realdb.test.ts — the session store on a real Postgres, as the app
 * login (BR3.1, BR3.4–BR3.7; AC1.3.3, AC1.3.4, AC1.3.8, AC1.3.9; NFR6.10).
 *
 * The stub cannot prove the one-statement `UPDATE … FROM users … RETURNING` works under real
 * grants and types, nor that a session survives a new connection pool (a server restart).
 * The `at` passed to the store is the app clock, so the boundaries are exact here too.
 */
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import postgres from "postgres";
import { deleteSessionByToken, insertSession, resolveSession } from "../../src/auth/session.js";
import { sha256 } from "../../src/auth/sha256.js";
import type { Uuid } from "../../src/data/uuid.js";
import { freshDatabase, realdbEnabled, type FreshDatabase } from "./fresh-database.js";

const BUSINESS = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" as Uuid;
const OWNER = "11111111-1111-4111-8111-111111111111" as Uuid;
const T0 = new Date("2026-10-27T09:00:00.000Z");
const HOUR = 60 * 60 * 1000;
const at = (ms: number): Date => new Date(T0.getTime() + ms);

describe.skipIf(!realdbEnabled)("sessions on real Postgres", () => {
  let db: FreshDatabase;

  beforeAll(async () => {
    db = await freshDatabase("sessions");
    await db.admin.begin(async (tx) => {
      await tx`INSERT INTO users (id, email, password_hash, role, business_id)
               VALUES (${OWNER}, 'owner@realdb.test', 'x', 'owner', ${BUSINESS})`;
      await tx`INSERT INTO businesses (id, name, owner_user_id) VALUES (${BUSINESS}, 'A', ${OWNER})`;
    });
  });

  afterAll(async () => {
    await db.drop();
  });

  const fresh = () => insertSession(db.app, { userId: OWNER, businessId: BUSINESS, at: T0 });

  test("insert stores the hash only; resolve returns user, business and role", async () => {
    const s = await fresh();
    const [row] = await db.admin<{ token_hash: string }[]>`
      SELECT token_hash FROM sessions WHERE token_hash = ${await sha256(s.token)}
    `;
    expect(row?.token_hash).toBe(await sha256(s.token));
    const [raw] = await db.admin<{ n: number }[]>`
      SELECT count(*)::int AS n FROM sessions WHERE token_hash = ${s.token}
    `;
    expect(raw?.n).toBe(0);
    expect(await resolveSession(db.app, s.token, at(HOUR))).toMatchObject({
      userId: OWNER,
      businessId: BUSINESS,
      role: "owner",
    });
  });

  test("idle: 12 h − 1 ms is valid, exactly 12 h is not (BR3.5)", async () => {
    expect(await resolveSession(db.app, (await fresh()).token, at(12 * HOUR - 1))).not.toBeNull();
    expect(await resolveSession(db.app, (await fresh()).token, at(12 * HOUR))).toBeNull();
  });

  test("expiry: a session used a minute ago is still invalid at its 30-day cap (BR3.4)", async () => {
    const s = await fresh();
    const cap = s.expiresAt.getTime() - T0.getTime();
    await db.admin`
      UPDATE sessions SET last_seen_at = ${at(cap - 60_000).toISOString()}::timestamptz
      WHERE token_hash = ${await sha256(s.token)}
    `;
    expect(await resolveSession(db.app, s.token, at(cap - 1))).not.toBeNull();
    expect(await resolveSession(db.app, s.token, at(cap))).toBeNull();
  });

  test("an inactive user's session is refused", async () => {
    const s = await fresh();
    await db.admin`UPDATE users SET active = false WHERE id = ${OWNER}`;
    try {
      expect(await resolveSession(db.app, s.token, at(1))).toBeNull();
    } finally {
      await db.admin`UPDATE users SET active = true WHERE id = ${OWNER}`;
    }
  });

  test("restart safety: a new connection pool resolves the same cookie (BR3.7)", async () => {
    const s = await fresh();
    const restarted = postgres(db.appUrl, { max: 1, prepare: false });
    try {
      expect(await resolveSession(restarted, s.token, at(HOUR))).not.toBeNull();
    } finally {
      await restarted.end({ timeout: 5 });
    }
  });

  test("delete by hash ends the session; the old cookie resolves to nothing", async () => {
    const s = await fresh();
    expect(await deleteSessionByToken(db.app, s.token)).toEqual({
      userId: OWNER,
      businessId: BUSINESS,
    });
    expect(await resolveSession(db.app, s.token, at(1))).toBeNull();
  });

  test("with 1 000 sessions, resolve is an index lookup on token_hash (NFR6.10)", async () => {
    await db.admin`
      INSERT INTO sessions (id, user_id, business_id, token_hash, expires_at)
      SELECT gen_random_uuid(), ${OWNER}, ${BUSINESS}, md5(g::text), now() + interval '1 day'
      FROM generate_series(1, 1000) AS g
    `;
    await db.admin`ANALYZE sessions`;
    const plan = await db.admin<{ "QUERY PLAN": unknown }[]>`
      EXPLAIN (FORMAT JSON)
      SELECT 1 FROM sessions WHERE token_hash = ${"0".repeat(64)}
    `;
    expect(JSON.stringify(plan)).toContain("sessions_token_hash_idx");
  });
});
