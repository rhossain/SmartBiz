/**
 * tests/integration/audit-append-flow.test.ts — UC-1.9.
 * Every state-mutating action inserts an audit row.
 *
 * This integration test runs against the SQL stub (no live DB)
 * to assert the cross-action append invariant. When DATABASE_URL
 * is set, the orchestrator wires a DB-backed variant.
 */
import { describe, expect, test } from "bun:test";
import { signUp } from "../../src/auth/sign-up.js";
import { signIn } from "../../src/auth/sign-in.js";
import { createInvite } from "../../src/auth/invite.js";
import { acceptInvite } from "../../src/auth/accept-invite.js";
import { requestRecovery } from "../../src/auth/recover.js";
import { makeSqlStub } from "../helpers/sql-stub.js";
import { setTestClock, FROZEN_TEST_NOW, resetTestClock } from "../../src/data/clock.js";
import { resetFlowLimiters } from "../../src/auth/attempt-limiter.js";
import { authDeps } from "../helpers/auth-fixtures.js";

describe("integration: audit append on every mutation (UC-1.9)", () => {
  test("sign-up, sign-in, invite, accept, recover all append audit rows", async () => {
    resetFlowLimiters();
    setTestClock(FROZEN_TEST_NOW);
    const stub = makeSqlStub();
    const su = await signUp(
      stub.sql,
      {
        email: "owner@example.com",
        password: "verysecret",
        businessName: "Acme",
        locale: "bn",
      },
      authDeps(),
    );
    if (!su.ok) throw new Error("signup");
    const ownerId = su.value.user.id;
    const businessId = su.value.businessId;

    await signIn(
      stub.sql,
      { email: "owner@example.com", password: "verysecret", presentedToken: null },
      authDeps(),
    );

    const inv = await createInvite(stub.sql, {
      businessId,
      actorUserId: ownerId,
      actorRole: "owner",
      email: "new@example.com",
      role: "manager",
      nowMs: FROZEN_TEST_NOW.getTime() + 2000,
    });
    if (!inv.ok) throw new Error("invite");

    await acceptInvite(stub.sql, {
      token: inv.value.acceptToken,
      password: "newsecret1",
      emailHint: "new@example.com",
      nowMs: FROZEN_TEST_NOW.getTime() + 3000,
    });

    await requestRecovery(stub.sql, "owner@example.com", FROZEN_TEST_NOW.getTime() + 4000);

    const actions = stub.state.auditLog.map((r) => r["action"]);
    expect(actions).toContain("auth.sign_up");
    expect(actions).toContain("auth.sign_in");
    expect(actions).toContain("auth.invite");
    expect(actions).toContain("auth.invite.accept");
    expect(actions).toContain("auth.recover.request");
    resetTestClock();
  });
});
