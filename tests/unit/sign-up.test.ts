/**
 * tests/unit/sign-up.test.ts — first-run sign-up (W3; US1.2; BR2.1–BR2.5, BR4.4; O4).
 *
 * Restated rules: valid email, password ≥ 10 characters, business name 1–120 (before any
 * SQL); open only while no business exists; user + business + `auth.sign_up` (no email in
 * the payload) in one transaction; a unique violation is re-checked — business now exists →
 * business_exists, else email_taken; any other database error is thrown, never reported as
 * email_taken; the returned user has no password hash; the session token is stored hashed.
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { sha256 } from "../../src/auth/sha256.js";
import { createHashGate } from "../../src/auth/hash-gate.js";
import { signUp, type SignUpInput } from "../../src/auth/sign-up.js";
import type { Sql } from "../../src/db/client.js";
import { FROZEN_TEST_NOW, resetTestClock, setTestClock } from "../../src/data/clock.js";
import { makeSqlStub } from "../helpers/sql-stub.js";
import { authDeps, OWNER_EMAIL, OWNER_PASSWORD } from "../helpers/auth-fixtures.js";

const input = (over: Partial<SignUpInput> = {}): SignUpInput => ({
  email: OWNER_EMAIL,
  password: OWNER_PASSWORD,
  businessName: "Acme",
  locale: "bn",
  ...over,
});

beforeEach(() => setTestClock(FROZEN_TEST_NOW));
afterEach(() => resetTestClock());

describe("sign-up (W3)", () => {
  test("creates the Owner, the one business and an email-free audit row; signs in", async () => {
    const stub = makeSqlStub();
    const r = await signUp(stub.sql, input(), authDeps());
    if (!r.ok) throw new Error(`sign-up failed: ${r.error.kind}`);
    expect(r.value.user).toEqual({
      id: r.value.user.id,
      email: OWNER_EMAIL,
      role: "owner",
      locale: "bn",
    });
    expect(stub.state.users).toHaveLength(1);
    expect(stub.state.users[0]?.["business_id"]).toBe(r.value.businessId);
    expect(stub.state.businesses).toHaveLength(1);
    expect(stub.state.businesses[0]?.["owner_user_id"]).toBe(r.value.user.id);
    expect(String(stub.state.users[0]?.["password_hash"])).toMatch(/^\$argon2id\$/);
    const audit = stub.state.auditLog.find((a) => a["action"] === "auth.sign_up");
    expect(audit?.["subject_id"]).toBe(r.value.user.id);
    expect(JSON.parse(String(audit?.["payload"]))).toEqual({});
    expect(stub.state.sessions[0]?.["token_hash"]).toBe(await sha256(r.value.session.token));
  });

  test("an email without one @ and a dot after it is invalid_email; nothing is written", async () => {
    for (const email of ["not-an-email", "a@b", "a b@c.de", "@x.com", `${"a".repeat(250)}@x.com`]) {
      const stub = makeSqlStub();
      const r = await signUp(stub.sql, input({ email }), authDeps());
      expect({ email, kind: r.ok ? "ok" : r.error.kind }).toEqual({ email, kind: "invalid_email" });
      expect(stub.calls).toHaveLength(0);
    }
  });

  test("a 9-character password is too short; 10 characters is accepted (BR2.4)", async () => {
    const short = await signUp(makeSqlStub().sql, input({ password: "123456789" }), authDeps());
    expect(short.ok ? "ok" : short.error.kind).toBe("password_too_short");
    const exact = await signUp(makeSqlStub().sql, input({ password: "1234567890" }), authDeps());
    expect(exact.ok).toBe(true);
  });

  test("an empty or over-long business name is invalid_input", async () => {
    for (const businessName of ["   ", "x".repeat(121)]) {
      const r = await signUp(makeSqlStub().sql, input({ businessName }), authDeps());
      expect(r.ok ? "ok" : r.error.kind).toBe("invalid_input");
    }
  });

  test("once a business exists, sign-up is business_exists and hashes nothing (BR2.1)", async () => {
    const stub = makeSqlStub();
    await signUp(stub.sql, input(), authDeps());
    let hashed = 0;
    const gate = createHashGate();
    const counting = {
      ...gate,
      run: <T>(w: () => Promise<T>) => {
        hashed += 1;
        return gate.run(w);
      },
    };
    const r = await signUp(stub.sql, input({ email: "second@example.com" }), {
      hashGate: counting,
    });
    expect(r.ok ? "ok" : r.error.kind).toBe("business_exists");
    expect(hashed).toBe(0);
    expect(stub.state.businesses).toHaveLength(1);
  });

  test("a racing sign-up that loses at insert is business_exists, not email_taken (BR2.3)", async () => {
    const stub = makeSqlStub();
    // The competitor's business lands between this sign-up's check and its insert.
    let checked = false;
    const racing = ((strings: TemplateStringsArray, ...params: unknown[]) => {
      const rows = stub.sql(strings, ...(params as never[]));
      if (!checked && strings.join("?").includes("FROM businesses LIMIT 1")) {
        checked = true;
        stub.state.businesses.push({ id: "b0000000-0000-4000-8000-00000000000b", name: "B" });
      }
      return rows;
    }) as unknown as Sql;
    Object.assign(racing, { begin: stub.sql.begin, array: stub.sql.array });
    const r = await signUp(racing, input(), authDeps());
    expect(r.ok ? "ok" : r.error.kind).toBe("business_exists");
    expect(stub.state.users).toHaveLength(0);
    expect(stub.state.auditLog).toHaveLength(0);
  });

  test("a unique violation on the email with no business is email_taken", async () => {
    const stub = makeSqlStub({
      users: [{ id: "u0000000-0000-4000-8000-000000000001", email: "OWNER@example.com" }],
    });
    const r = await signUp(stub.sql, input(), authDeps());
    expect(r.ok ? "ok" : r.error.kind).toBe("email_taken");
  });

  test("any other database error is thrown, never reported as email_taken (BR2.5)", async () => {
    const stub = makeSqlStub({ failOn: /INSERT INTO users/ });
    await expect(signUp(stub.sql, input(), authDeps())).rejects.toMatchObject({ code: "08006" });
    expect(stub.state.businesses).toHaveLength(0);
  });

  test("a full hash gate refuses with rate_limited before anything is written", async () => {
    const gate = createHashGate(0, 0);
    const stub = makeSqlStub();
    const r = await signUp(stub.sql, input(), { hashGate: gate });
    expect(r.ok ? "ok" : r.error).toEqual({ kind: "rate_limited", retryAfterMs: 5_000 });
    expect(stub.state.users).toHaveLength(0);
  });
});
