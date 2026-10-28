/**
 * tests/integration/email-gateway-failure.test.ts — graceful degradation of the optional
 * email gateway (team.md Deployment: a free hosted service only when the app degrades
 * gracefully without it).
 *
 * U3 sends no email at all (C6, NFR10.3): an invitation is a link the Owner or Manager copies
 * by hand. The gateway stays optional and unused by the invitation flow, so a failing
 * gateway cannot stop an invitation: the invitation and its link exist whatever the gateway
 * answers.
 */
import { describe, expect, test } from "bun:test";
import { createInvitation } from "../../src/auth/invite.js";
import { failingEmailGateway, noopEmailGateway, sendInviteEmail } from "../../src/auth/email.js";
import { FROZEN_TEST_NOW, resetTestClock, setTestClock } from "../../src/data/clock.js";
import { staffWorld } from "../helpers/staff-fixtures.js";

describe("integration: email gateway failure (graceful degradation)", () => {
  test("failing gateway returns Err; the caller can fall back to a copy-URL UI", async () => {
    const r = await sendInviteEmail(failingEmailGateway, "x@e.com", "https://example.com/accept/x");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("smtp_failure");
  });

  test("healthy gateway returns Ok", async () => {
    const r = await sendInviteEmail(noopEmailGateway, "x@e.com", "https://example.com/accept/x");
    expect(r.ok).toBe(true);
  });

  test("an invitation and its link exist whatever the gateway answers (C6: no email sent)", async () => {
    setTestClock(FROZEN_TEST_NOW);
    const w = await staffWorld();
    const r = await createInvitation(w.stub.sql, {
      businessId: w.businessId,
      actor: { id: w.id("owner"), role: "owner" },
      email: "new@example.com",
      role: "manager",
      now: FROZEN_TEST_NOW,
      port: 3000,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(w.stub.state.invitations.length).toBe(1);
    const send = await sendInviteEmail(failingEmailGateway, "new@example.com", r.value.link);
    expect(send.ok).toBe(false);
    expect(w.stub.state.invitations.length).toBe(1);
    resetTestClock();
  });
});
