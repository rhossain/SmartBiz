/**
 * tests/unit/sign-in.test.ts — sign-in (W4; US1.3; BR3.3, BR4.1–BR4.4; NFR3.5).
 *
 * Restated rules: the typed email (trimmed, any case) finds the account; unknown email,
 * wrong password and inactive user all return the identical `invalid_credentials`; the
 * failure audit row holds the user id only when the email matched and a reason code only,
 * and is not written while no business exists; the 6th attempt in 15 minutes is
 * `rate_limited` without checking the password; success clears the count, writes
 * `auth.sign_in` before the session rows, and ends the session this browser presented.
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createAttemptLimiter, SIGN_IN_LIMIT } from "../../src/auth/attempt-limiter.js";
import { createHashGate, type HashGate } from "../../src/auth/hash-gate.js";
import { insertSession } from "../../src/auth/session.js";
import { sha256 } from "../../src/auth/sha256.js";
import { signIn, type SignInDeps } from "../../src/auth/sign-in.js";
import { signUp } from "../../src/auth/sign-up.js";
import { FROZEN_TEST_NOW, resetTestClock, setTestClock } from "../../src/data/clock.js";
import type { Uuid } from "../../src/data/uuid.js";
import { makeSqlStub, type RecordedCall } from "../helpers/sql-stub.js";
import { authDeps, OWNER_EMAIL, OWNER_PASSWORD } from "../helpers/auth-fixtures.js";

const seedOwner = async (): Promise<ReturnType<typeof makeSqlStub>> => {
  const stub = makeSqlStub();
  const r = await signUp(
    stub.sql,
    { email: OWNER_EMAIL, password: OWNER_PASSWORD, businessName: "Acme", locale: "bn" },
    authDeps(),
  );
  if (!r.ok) throw new Error("seed failed");
  stub.state.auditLog.length = 0;
  stub.state.sessions.length = 0;
  stub.calls.length = 0;
  return stub;
};

const countingGate = (): { gate: HashGate; runs: () => number } => {
  const inner = createHashGate();
  let n = 0;
  return {
    gate: {
      ...inner,
      run: <T>(w: () => Promise<T>) => {
        n += 1;
        return inner.run(w);
      },
    },
    runs: () => n,
  };
};

const indexOf = (calls: ReadonlyArray<RecordedCall>, re: RegExp): number =>
  calls.findIndex((c) => re.test(c.text));

beforeEach(() => setTestClock(FROZEN_TEST_NOW));
afterEach(() => resetTestClock());

describe("sign-in (W4)", () => {
  test("the right password signs in, ignoring the email's case and spaces", async () => {
    const stub = await seedOwner();
    const r = await signIn(
      stub.sql,
      { email: "  Owner@Example.COM ", password: OWNER_PASSWORD, presentedToken: null },
      authDeps(),
    );
    if (!r.ok) throw new Error(`sign-in failed: ${r.error.kind}`);
    expect(r.value.user).toEqual({
      id: r.value.user.id,
      email: OWNER_EMAIL,
      role: "owner",
      locale: "bn",
    });
    expect(r.value.businessId).toBe(stub.state.businesses[0]?.["id"] as Uuid);
    expect(stub.state.sessions[0]?.["token_hash"]).toBe(await sha256(r.value.session.token));
    const audit = stub.state.auditLog.find((a) => a["action"] === "auth.sign_in");
    expect(JSON.parse(String(audit?.["payload"]))).toEqual({});
  });

  test("unknown email, wrong password and inactive user get the identical error (BR4.1)", async () => {
    const stub = await seedOwner();
    const wrong = await signIn(
      stub.sql,
      { email: OWNER_EMAIL, password: "wrong-password", presentedToken: null },
      authDeps(),
    );
    const unknown = await signIn(
      stub.sql,
      { email: "nobody@example.com", password: OWNER_PASSWORD, presentedToken: null },
      authDeps(),
    );
    stub.state.users[0]!["active"] = false;
    const inactive = await signIn(
      stub.sql,
      { email: OWNER_EMAIL, password: OWNER_PASSWORD, presentedToken: null },
      authDeps(),
    );
    for (const r of [wrong, unknown, inactive]) {
      expect(r).toEqual({ ok: false, error: { kind: "invalid_credentials" } });
    }
    expect(stub.state.sessions).toHaveLength(0);
  });

  test("failure rows carry the user id only when matched and a reason code only (BR4.3)", async () => {
    const stub = await seedOwner();
    const ownerId = stub.state.users[0]?.["id"];
    await signIn(
      stub.sql,
      { email: OWNER_EMAIL, password: "Typed-Secret-1", presentedToken: null },
      authDeps(),
    );
    await signIn(
      stub.sql,
      { email: "typo.owner@example.com", password: "Typed-Secret-2", presentedToken: null },
      authDeps(),
    );
    const rows = stub.state.auditLog.filter((a) => a["action"] === "auth.sign_in.failure");
    expect(rows.map((r) => [r["subject_id"], JSON.parse(String(r["payload"]))])).toEqual([
      [ownerId, { reason: "bad_password" }],
      [null, { reason: "no_user" }],
    ]);
    const text = JSON.stringify(stub.state.auditLog);
    for (const typed of ["Typed-Secret-1", "Typed-Secret-2", "typo.owner", OWNER_EMAIL]) {
      expect({ typed, present: text.includes(typed) }).toEqual({ typed, present: false });
    }
  });

  test("with no business yet, a failed sign-in writes no audit row", async () => {
    const stub = makeSqlStub();
    const r = await signIn(
      stub.sql,
      { email: OWNER_EMAIL, password: OWNER_PASSWORD, presentedToken: null },
      authDeps(),
    );
    expect(r.ok ? "ok" : r.error.kind).toBe("invalid_credentials");
    expect(stub.state.auditLog).toHaveLength(0);
  });

  test("an unknown email still runs one password verify (timing, T15)", async () => {
    const stub = await seedOwner();
    const { gate, runs } = countingGate();
    await signIn(
      stub.sql,
      { email: "nobody@example.com", password: "x".repeat(12), presentedToken: null },
      { limiter: createAttemptLimiter(SIGN_IN_LIMIT), hashGate: gate },
    );
    expect(runs()).toBe(1);
  });

  test("the 6th attempt in the window is rate_limited without a password check (BR4.2)", async () => {
    const stub = await seedOwner();
    const { gate, runs } = countingGate();
    const deps: SignInDeps = { limiter: createAttemptLimiter(SIGN_IN_LIMIT), hashGate: gate };
    for (let i = 0; i < 5; i++) {
      const r = await signIn(
        stub.sql,
        { email: OWNER_EMAIL, password: "nope-nope-1", presentedToken: null },
        deps,
      );
      expect(r.ok ? "ok" : r.error.kind).toBe("invalid_credentials");
    }
    const sixth = await signIn(
      stub.sql,
      { email: OWNER_EMAIL, password: OWNER_PASSWORD, presentedToken: null },
      deps,
    );
    expect(sixth).toEqual({
      ok: false,
      error: { kind: "rate_limited", retryAfterMs: 15 * 60 * 1000 },
    });
    expect(runs()).toBe(5);
  });

  test("a success clears the count, so five more failures are allowed again", async () => {
    const stub = await seedOwner();
    const deps = authDeps();
    const fail = { email: OWNER_EMAIL, password: "nope-nope-1", presentedToken: null };
    for (let i = 0; i < 4; i++) await signIn(stub.sql, fail, deps);
    const ok = await signIn(stub.sql, { ...fail, password: OWNER_PASSWORD }, deps);
    expect(ok.ok).toBe(true);
    for (let i = 0; i < 5; i++) {
      const r = await signIn(stub.sql, fail, deps);
      expect(r.ok ? "ok" : r.error.kind).toBe("invalid_credentials");
    }
  });

  test("success ends the presented session and writes the audit row first (BR3.3)", async () => {
    const stub = await seedOwner();
    const userId = stub.state.users[0]?.["id"] as Uuid;
    const businessId = stub.state.businesses[0]?.["id"] as Uuid;
    const old = await insertSession(stub.sql, { userId, businessId, at: FROZEN_TEST_NOW });
    stub.calls.length = 0;
    const r = await signIn(
      stub.sql,
      { email: OWNER_EMAIL, password: OWNER_PASSWORD, presentedToken: old.token },
      authDeps(),
    );
    expect(r.ok).toBe(true);
    expect(stub.state.sessions.map((s) => s["token_hash"])).toEqual([
      await sha256(r.ok ? r.value.session.token : ""),
    ]);
    const audit = indexOf(stub.calls, /INSERT INTO audit_log/);
    expect(audit).toBeGreaterThanOrEqual(0);
    expect(audit).toBeLessThan(indexOf(stub.calls, /DELETE FROM sessions/));
    expect(audit).toBeLessThan(indexOf(stub.calls, /INSERT INTO sessions/));
  });
});

/*
 * U3 review G-01 (BR4.3, NFR3.21): a password reset or a deactivation that commits between
 * the verify and the session transaction wins. Restated: the transaction locks the business
 * then the user row before it reads the hash and `active` again; a changed hash or an inactive
 * user issues no session, answers the identical `invalid_credentials` and audits the failure
 * with its reason code. (The real race on Postgres is in tests/realdb/staff.realdb.test.ts.)
 */
describe("sign-in re-checks the user under its lock (G-01)", () => {
  const raced = async (change: (owner: Record<string, unknown>) => void) => {
    const stub = await seedOwner();
    const owner = stub.state.users[0] as Record<string, unknown>;
    const r = await signIn(
      stub.sql,
      { email: OWNER_EMAIL, password: OWNER_PASSWORD, presentedToken: null },
      {
        ...authDeps(),
        hooks: {
          beforeTransaction: async () => {
            change(owner);
          },
        },
      },
    );
    return { stub, r };
  };

  test("a hash changed after the verify: invalid_credentials, no session, bad_password audited", async () => {
    const { stub, r } = await raced((owner) => {
      owner["password_hash"] = "$argon2id$v=19$changed-by-a-reset";
    });
    expect(r).toEqual({ ok: false, error: { kind: "invalid_credentials" } });
    expect(stub.state.sessions).toHaveLength(0);
    expect(stub.state.auditLog.map((a) => [a["action"], JSON.parse(String(a["payload"]))])).toEqual(
      [["auth.sign_in.failure", { reason: "bad_password" }]],
    );
  });

  test("a user deactivated after the verify: invalid_credentials, no session, inactive audited", async () => {
    const { stub, r } = await raced((owner) => {
      owner["active"] = false;
    });
    expect(r).toEqual({ ok: false, error: { kind: "invalid_credentials" } });
    expect(stub.state.sessions).toHaveLength(0);
    expect(JSON.parse(String(stub.state.auditLog[0]?.["payload"]))).toEqual({ reason: "inactive" });
  });

  test("the lock order is business (key share) → user row, before any write", async () => {
    const { stub, r } = await raced(() => undefined);
    expect(r.ok).toBe(true);
    const order = [
      /FROM businesses WHERE id = \? FOR KEY SHARE/,
      /SELECT password_hash, active FROM users WHERE id = \? FOR UPDATE/,
      /INSERT INTO audit_log/,
      /INSERT INTO sessions/,
    ].map((re) => indexOf(stub.calls, re));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });
});
