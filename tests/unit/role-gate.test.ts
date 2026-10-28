/**
 * tests/unit/role-gate.test.ts — BR2.1, BR2.2, BR2.3, BR2.4.
 */
import { describe, expect, test } from "bun:test";
import { hasCapability, capabilitiesFor } from "../../src/auth/capability.js";
import { evaluateGate } from "../../src/auth/three-layer-gate.js";
import { err, ok } from "../../src/data/result.js";

describe("role × capability matrix (BR2.1, BR2.2, BR2.3, BR2.4)", () => {
  test("sales_staff cannot manage staff (BR2.3)", () => {
    expect(hasCapability("sales_staff", "staff.invite")).toBe(false);
    expect(hasCapability("sales_staff", "staff.manage")).toBe(false);
  });

  test("manager cannot edit business (BR2.2)", () => {
    expect(hasCapability("manager", "business.edit")).toBe(false);
    expect(hasCapability("owner", "business.edit")).toBe(true);
  });

  test("accountant cannot sign-in as owner — capability check rejects (BR2.1)", () => {
    // Accountant doesn't have money.mutate.full; the sign-in action
    // itself is allowed for any active user, but the post-sign-in
    // capability gate rejects protected routes.
    expect(hasCapability("accountant", "money.mutate.full")).toBe(false);
    expect(hasCapability("accountant", "money.mutate.cost")).toBe(true);
  });

  test("capability set is the source of truth (each role has a non-empty Set)", () => {
    for (const role of ["owner", "manager", "sales_staff", "accountant"] as const) {
      const caps = capabilitiesFor(role);
      expect(caps.size).toBeGreaterThan(0);
    }
  });

  test("three-layer gate: missing session → not_authenticated", () => {
    const r = evaluateGate(null, 1, "audit.view", null, undefined);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("not_authenticated");
  });

  test("three-layer gate: expired session → session_expired", () => {
    const r = evaluateGate(
      { userId: "u", businessId: "b", role: "owner", expiresAt: 0 },
      1_000_000,
      "audit.view",
      null,
      undefined,
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("session_expired");
  });

  test("three-layer gate: insufficient capability → forbidden", () => {
    const r = evaluateGate(
      { userId: "u", businessId: "b", role: "sales_staff", expiresAt: 1_000_000 },
      1,
      "business.edit",
      null,
      undefined,
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("forbidden");
  });

  test("three-layer gate: business rule violation → business_rule_violated", () => {
    const r = evaluateGate(
      { userId: "u", businessId: "b", role: "owner", expiresAt: 1_000_000 },
      1,
      "business.edit",
      { name: "lock", evaluate: () => err({ kind: "business_locked", reason: "test" }) },
      undefined,
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("business_rule_violated");
  });

  test("three-layer gate: passing all three layers returns Ok", () => {
    const r = evaluateGate(
      { userId: "u", businessId: "b", role: "owner", expiresAt: 1_000_000 },
      1,
      "audit.view",
      { name: "ok", evaluate: () => ok(true as const) },
      undefined,
    );
    expect(r.ok).toBe(true);
  });
});
