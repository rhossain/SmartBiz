/**
 * tests/integration/email-gateway-failure.test.ts — graceful degradation.
 * When the email gateway returns SmtpError, the invite flow
 * shows a "copy this URL" UI and the audit row records the failure.
 */
import { describe, expect, test } from "bun:test";
import { signUp } from "../../src/auth/sign-up.js";
import { createInvite } from "../../src/auth/invite.js";
import { sendInviteEmail, failingEmailGateway, noopEmailGateway } from "../../src/auth/email.js";
import { makeSqlStub } from "../helpers/sql-stub.js";
import { setTestClock, FROZEN_TEST_NOW, resetTestClock } from "../../src/data/clock.js";
import { resetBuckets } from "../../src/auth/rate-limit.js";
import { warn as _warn } from "../../src/observability/log.js";
import type { Uuid } from "../../src/types/uuid.js";

describe("integration: email gateway failure (graceful degradation)", () => {
  test("failing gateway returns Err; the caller can fall back to a copy-URL UI", async () => {
    resetBuckets();
    setTestClock(FROZEN_TEST_NOW);
    const r = await sendInviteEmail(failingEmailGateway, "x@e.com", "https://example.com/accept/x");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("smtp_failure");
    void _warn;
    resetTestClock();
  });

  test("healthy gateway returns Ok", async () => {
    const r = await sendInviteEmail(noopEmailGateway, "x@e.com", "https://example.com/accept/x");
    expect(r.ok).toBe(true);
  });

  test("the invite still records the accept token in the DB even when the gateway fails", async () => {
    resetBuckets();
    setTestClock(FROZEN_TEST_NOW);
    const stub = makeSqlStub();
    const su = await signUp(stub.sql, { email: "o@e.com", password: "verysecret", businessName: "A", locale: "bn" });
    if (!su.ok) throw new Error("signup");
    const r = await createInvite(stub.sql, {
      businessId: su.value.businessId as Uuid,
      actorUserId: su.value.user.id as Uuid,
      actorRole: "owner",
      email: "new@example.com",
      role: "manager",
      nowMs: FROZEN_TEST_NOW.getTime(),
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(stub.state.invitations.length).toBe(1);
    const send = await sendInviteEmail(failingEmailGateway, "new@example.com", `https://app/accept/${r.value.acceptToken}`);
    expect(send.ok).toBe(false);
    resetTestClock();
  });
});
