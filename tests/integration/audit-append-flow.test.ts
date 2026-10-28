/**
 * tests/integration/audit-append-flow.test.ts — UC-1.9, U3 BR8.1.
 * Every state-mutating auth action inserts an audit row.
 *
 * Runs against the SQL stub (no live DB) to assert the cross-action append invariant over
 * sign-up, sign-in and the four U3 staff actions: an invitation, its acceptance, a reset link
 * and the reset (BR8.1). Browser recovery is the exception by design: it does nothing and
 * writes nothing (BR5.1, D-01). The same flows on a real database are in
 * tests/realdb/staff.realdb.test.ts.
 */
import { describe, expect, test } from "bun:test";
import { acceptInvitation } from "../../src/auth/accept-invite.js";
import { createInvitation } from "../../src/auth/invite.js";
import { completeReset, createResetLink } from "../../src/auth/password-reset.js";
import { recover } from "../../src/auth/recover.js";
import { signIn } from "../../src/auth/sign-in.js";
import { signUp } from "../../src/auth/sign-up.js";
import { FROZEN_TEST_NOW, resetTestClock, setTestClock } from "../../src/data/clock.js";
import { authDeps } from "../helpers/auth-fixtures.js";
import { makeSqlStub } from "../helpers/sql-stub.js";
import { NEW_PASSWORD, tokenOf } from "../helpers/staff-fixtures.js";

describe("integration: audit append on every mutation (UC-1.9, BR8.1)", () => {
  test("sign-up, sign-in, invite, accept, reset link and reset all append audit rows", async () => {
    setTestClock(FROZEN_TEST_NOW);
    const stub = makeSqlStub();
    const su = await signUp(
      stub.sql,
      { email: "owner@example.com", password: "verysecret", businessName: "Acme", locale: "bn" },
      authDeps(),
    );
    if (!su.ok) throw new Error("signup");
    const owner = { id: su.value.user.id, role: "owner" as const };
    const businessId = su.value.businessId;
    const at = (ms: number): Date => new Date(FROZEN_TEST_NOW.getTime() + ms);

    await signIn(
      stub.sql,
      { email: "owner@example.com", password: "verysecret", presentedToken: null },
      authDeps(),
    );
    const inv = await createInvitation(stub.sql, {
      businessId,
      actor: owner,
      email: "new@example.com",
      role: "manager",
      now: at(2000),
      port: 3000,
    });
    if (!inv.ok) throw new Error("invite");
    const accepted = await acceptInvitation(
      stub.sql,
      {
        token: tokenOf(inv.value.link),
        password: NEW_PASSWORD,
        presentedToken: null,
        now: at(3000),
      },
      authDeps(),
    );
    if (!accepted.ok) throw new Error("accept");
    const link = await createResetLink(stub.sql, {
      via: "staff",
      businessId,
      by: owner,
      targetUserId: accepted.value.user.id,
      now: at(4000),
      port: 3000,
    });
    if (!link.ok) throw new Error("reset link");
    const reset = await completeReset(
      stub.sql,
      { token: tokenOf(link.value.link), password: `${NEW_PASSWORD}-2`, now: at(5000) },
      authDeps(),
    );
    expect(reset.ok).toBe(true);
    const rowsBeforeRecover = stub.state.auditLog.length;
    recover({ email: "owner@example.com" });

    const actions = stub.state.auditLog.map((r) => r["action"]);
    expect(actions).toEqual([
      "auth.sign_up",
      "auth.sign_in",
      "auth.invite_created",
      "auth.invite_accepted",
      "auth.reset_link_created",
      "auth.password_reset",
    ]);
    expect(stub.state.auditLog.length).toBe(rowsBeforeRecover);
    // No zero-UUID business anywhere (BR3.5).
    expect(stub.state.auditLog.every((r) => r["business_id"] === businessId)).toBe(true);
    resetTestClock();
  });
});
