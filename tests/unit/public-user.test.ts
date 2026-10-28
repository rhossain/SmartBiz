/**
 * tests/unit/public-user.test.ts — no password hash ever leaves AuthComponent (BR4.4,
 * NFR3.6, P-16).
 *
 * Checked on every value the auth functions return, serialised, and on the helper that
 * builds the public user from a private record that does carry a hash.
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { capabilitiesFor } from "../../src/auth/capability.js";
import { toPublicUser, toSessionView } from "../../src/auth/public-user.js";
import { signIn } from "../../src/auth/sign-in.js";
import { signUp } from "../../src/auth/sign-up.js";
import { FROZEN_TEST_NOW, resetTestClock, setTestClock } from "../../src/data/clock.js";
import type { Uuid } from "../../src/data/uuid.js";
import { makeSqlStub } from "../helpers/sql-stub.js";
import { authDeps, OWNER_EMAIL, OWNER_PASSWORD } from "../helpers/auth-fixtures.js";

const SECRET_KEYS = /passwordHash|password_hash|token_hash|"password"/;

beforeEach(() => setTestClock(FROZEN_TEST_NOW));
afterEach(() => resetTestClock());

describe("public user", () => {
  test("toPublicUser keeps exactly id, email, role and locale", () => {
    const record = {
      id: "a1000000-0000-4000-8000-0000000000a1" as Uuid,
      businessId: "a0000000-0000-4000-8000-00000000000a" as Uuid,
      email: "o@x.test",
      passwordHash: "$argon2id$secret",
      role: "owner" as const,
      active: true,
      locale: "bn" as const,
    };
    const pub = toPublicUser(record);
    expect(Object.keys(pub).sort()).toEqual(["email", "id", "locale", "role"]);
    expect(JSON.stringify(pub)).not.toMatch(SECRET_KEYS);
  });

  test("sign-up and sign-in results serialise without any hash", async () => {
    const stub = makeSqlStub();
    const up = await signUp(
      stub.sql,
      { email: OWNER_EMAIL, password: OWNER_PASSWORD, businessName: "A", locale: "bn" },
      authDeps(),
    );
    const inn = await signIn(
      stub.sql,
      { email: OWNER_EMAIL, password: OWNER_PASSWORD, presentedToken: null },
      authDeps(),
    );
    for (const r of [up, inn]) {
      expect(r.ok).toBe(true);
      expect(JSON.stringify(r)).not.toMatch(SECRET_KEYS);
      expect(JSON.stringify(r)).not.toContain("$argon2");
    }
  });

  test("the session view lists the role's capabilities from the matrix, sorted", () => {
    const user = toPublicUser({
      id: "a1000000-0000-4000-8000-0000000000a1" as Uuid,
      email: "s@x.test",
      role: "sales_staff",
      locale: "bn",
    });
    const view = toSessionView(user, "a0000000-0000-4000-8000-00000000000a" as Uuid);
    expect(view.capabilities).toEqual([...capabilitiesFor("sales_staff")].sort());
    expect(view.user).toBe(user);
  });
});
