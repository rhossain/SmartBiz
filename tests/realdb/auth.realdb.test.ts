/**
 * tests/realdb/auth.realdb.test.ts — sign-up and sign-in on a real Postgres, as the app
 * login (BR2.2, BR2.3, BR2.5, BR3.3, BR4.3; AC1.2.4, AC1.2.5, AC1.3.2, AC1.3.6).
 *
 * Only a real database shows these: the deferred users → businesses reference checked at
 * commit, the singleton index refusing a racing second business, a unique violation versus
 * other errors, the real grants, and that a failed sign-in's audit row really holds no typed
 * text. Each case that needs an empty database gets its own.
 */
import { afterAll, describe, expect, test } from "bun:test";
import { resolveSession } from "../../src/auth/session.js";
import { signIn } from "../../src/auth/sign-in.js";
import { signUp, type SignUpInput } from "../../src/auth/sign-up.js";
import { now } from "../../src/data/clock.js";
import type { Locale } from "../../src/data/enums.js";
import { authDeps } from "../helpers/auth-fixtures.js";
import { freshDatabase, realdbEnabled, type FreshDatabase } from "./fresh-database.js";

const opened: FreshDatabase[] = [];
const open = async (label: string): Promise<FreshDatabase> => {
  const db = await freshDatabase(label);
  opened.push(db);
  return db;
};

const owner = (email: string): SignUpInput => ({
  email,
  password: "correct-horse-1",
  businessName: "Acme",
  locale: "bn",
});

describe.skipIf(!realdbEnabled)("auth on real Postgres", () => {
  afterAll(async () => {
    for (const db of opened) await db.drop();
  });

  test("racing sign-ups with different emails: exactly one business; the other is business_exists", async () => {
    const db = await open("race");
    const [a, b] = await Promise.all([
      signUp(db.app, owner("first@realdb.test"), authDeps()),
      signUp(db.app, owner("second@realdb.test"), authDeps()),
    ]);
    const kinds = [a, b].map((r) => (r.ok ? "ok" : r.error.kind)).sort();
    expect(kinds).toEqual(["business_exists", "ok"]);
    const [n] = await db.admin<{ b: number; u: number }[]>`
      SELECT (SELECT count(*)::int FROM businesses) AS b, (SELECT count(*)::int FROM users) AS u
    `;
    expect(n).toEqual({ b: 1, u: 1 });
  });

  test("racing identical sign-ups: the loser is business_exists, never email_taken", async () => {
    const db = await open("racesame");
    const results = await Promise.all([
      signUp(db.app, owner("same@realdb.test"), authDeps()),
      signUp(db.app, owner("same@realdb.test"), authDeps()),
    ]);
    expect(results.map((r) => (r.ok ? "ok" : r.error.kind)).sort()).toEqual([
      "business_exists",
      "ok",
    ]);
  });

  test("sign-in replaces the session this browser presented (BR3.3)", async () => {
    const db = await open("replace");
    const up = await signUp(db.app, owner("owner@realdb.test"), authDeps());
    if (!up.ok) throw new Error("sign-up failed");
    const first = up.value.session.token;
    const again = await signIn(
      db.app,
      { email: "owner@realdb.test", password: "correct-horse-1", presentedToken: first },
      authDeps(),
    );
    if (!again.ok) throw new Error("sign-in failed");
    expect(await resolveSession(db.app, first, now())).toBeNull();
    expect(await resolveSession(db.app, again.value.session.token, now())).not.toBeNull();
    const [n] = await db.admin<{ n: number }[]>`SELECT count(*)::int AS n FROM sessions`;
    expect(n?.n).toBe(1);
  });

  test("a failed sign-in's audit row holds no typed text (BR4.3)", async () => {
    const db = await open("failaudit");
    const up = await signUp(db.app, owner("owner@realdb.test"), authDeps());
    if (!up.ok) throw new Error("sign-up failed");
    await signIn(
      db.app,
      { email: "owner@realdb.test", password: "Typed-Wrong-Password", presentedToken: null },
      authDeps(),
    );
    await signIn(
      db.app,
      { email: "mistyped-owner@realdb.test", password: "Another-Typed-Text", presentedToken: null },
      authDeps(),
    );
    const rows = await db.admin<{ subject_id: string | null; payload: string }[]>`
      SELECT subject_id, payload::text AS payload FROM audit_log
      WHERE action = 'auth.sign_in.failure' ORDER BY occurred_at
    `;
    expect(rows.map((r) => [r.subject_id, JSON.parse(r.payload)])).toEqual([
      [up.value.user.id, { reason: "bad_password" }],
      [null, { reason: "no_user" }],
    ]);
    const [all] = await db.admin<
      { t: string }[]
    >`SELECT string_agg(payload::text, ' ') AS t FROM audit_log`;
    for (const typed of [
      "Typed-Wrong-Password",
      "Another-Typed-Text",
      "mistyped",
      "owner@realdb.test",
    ]) {
      expect({ typed, present: (all?.t ?? "").includes(typed) }).toEqual({ typed, present: false });
    }
  });

  test("a database error during sign-up is thrown, not reported as email_taken (BR2.5)", async () => {
    const db = await open("dberror");
    // A locale outside the CHECK makes Postgres refuse the user row (23514): a real error
    // that is not a unique violation.
    const bad = { ...owner("owner@realdb.test"), locale: "fr" as unknown as Locale };
    await expect(signUp(db.app, bad, authDeps())).rejects.toMatchObject({ code: "23514" });
    const [n] = await db.admin<{ n: number }[]>`SELECT count(*)::int AS n FROM businesses`;
    expect(n?.n).toBe(0);
  });
});
