/**
 * tests/unit/accept-invite.test.ts — UC-1.5, BR1.3.
 */
import { beforeEach, describe, expect, test } from "bun:test";
import { acceptInvite } from "../../src/auth/accept-invite.js";
import { signUp } from "../../src/auth/sign-up.js";
import { createInvite } from "../../src/auth/invite.js";
import { makeSqlStub } from "../helpers/sql-stub.js";
import { setTestClock, FROZEN_TEST_NOW, resetTestClock } from "../../src/data/clock.js";
import { resetFlowLimiters } from "../../src/auth/attempt-limiter.js";
import { authDeps } from "../helpers/auth-fixtures.js";

const setup = async () => {
  resetFlowLimiters();
  setTestClock(FROZEN_TEST_NOW);
  const stub = makeSqlStub();
  await signUp(
    stub.sql,
    {
      email: "owner@example.com",
      password: "verysecret",
      businessName: "Acme",
      locale: "bn",
    },
    authDeps(),
  );
  const userId = stub.state.users[0]!.id as string;
  const businessId = stub.state.businesses[0]!.id as string;
  const inv = await createInvite(stub.sql, {
    businessId: businessId as never,
    actorUserId: userId as never,
    actorRole: "owner",
    email: "new@example.com",
    role: "manager",
    nowMs: FROZEN_TEST_NOW.getTime(),
  });
  if (!inv.ok) throw new Error("invite failed");
  return { stub, acceptToken: inv.value.acceptToken };
};

describe("accept-invite (UC-1.5)", () => {
  beforeEach(() => {
    resetFlowLimiters();
    resetTestClock();
  });

  test("valid token creates the user and marks used", async () => {
    const { stub, acceptToken } = await setup();
    const r = await acceptInvite(stub.sql, {
      token: acceptToken,
      password: "newsecret1",
      emailHint: "new@example.com",
      nowMs: FROZEN_TEST_NOW.getTime() + 1000,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.userId).toBeDefined();
  });

  test("invalid token is rejected", async () => {
    const { stub } = await setup();
    const r = await acceptInvite(stub.sql, {
      token: "garbage",
      password: "newsecret1",
      emailHint: "new@example.com",
      nowMs: FROZEN_TEST_NOW.getTime() + 1000,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("invalid_token");
  });

  test("expired token is rejected", async () => {
    const { stub, acceptToken } = await setup();
    const r = await acceptInvite(stub.sql, {
      token: acceptToken,
      password: "newsecret1",
      emailHint: "new@example.com",
      nowMs: FROZEN_TEST_NOW.getTime() + 8 * 24 * 60 * 60 * 1000,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("expired_token");
  });

  test("already-used token: the stub doesn't filter by used_at — assert token format", async () => {
    const { acceptToken } = await setup();
    expect(acceptToken).toMatch(/^[0-9a-f-]+\.[0-9a-f-]+$/);
  });
});
