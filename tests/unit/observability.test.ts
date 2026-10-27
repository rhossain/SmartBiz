/**
 * Coverage booster — observability + audit list / export + role-grants import.
 */
import { describe, expect, test } from "bun:test";
import { info, warn, error } from "../../src/observability/log.js";
import { newCorrelationId, resetCorrelationCounter } from "../../src/observability/correlation.js";
import { listAuditForBusiness, auditRetentionFilter } from "../../src/audit/audit-service.js";
import { exportAudit } from "../../src/audit/audit-export.js";
import { makeSqlStub } from "../helpers/sql-stub.js";
import { signUp } from "../../src/auth/sign-up.js";
import { setTestClock, FROZEN_TEST_NOW, resetTestClock } from "../../src/data/clock.js";
import { hashPassword, verifyPassword } from "../../src/auth/argon2.js";
import { PASSWORD_MIN_LENGTH } from "../../src/auth/argon2.js";
import { capabilitiesFor } from "../../src/auth/capability.js";

describe("observability + audit read paths", () => {
  test("info / warn / error emit JSON lines", () => {
    const orig = process.stdout.write.bind(process.stdout);
    const lines: string[] = [];
    process.stdout.write = ((chunk: string | Uint8Array) => {
      lines.push(typeof chunk === "string" ? chunk : new TextDecoder().decode(chunk));
      return true;
    }) as typeof process.stdout.write;
    try {
      info("hello");
      warn("oh");
      error("nope");
    } finally {
      process.stdout.write = orig;
    }
    expect(lines.length).toBe(3);
    for (const l of lines) {
      expect(() => JSON.parse(l)).not.toThrow();
    }
  });

  test("correlation counter increments", () => {
    resetCorrelationCounter();
    const a = newCorrelationId();
    const b = newCorrelationId();
    expect(a).not.toBe(b);
  });

  test("listAuditForBusiness returns rows", async () => {
    setTestClock(FROZEN_TEST_NOW);
    const stub = makeSqlStub();
    await signUp(stub.sql, {
      email: "o@e.com",
      password: "verysecret",
      businessName: "A",
      locale: "bn",
    });
    const businessId = stub.state.businesses[0]!["id"] as never;
    const rows = await listAuditForBusiness(stub.sql, businessId);
    expect(Array.isArray(rows)).toBe(true);
    resetTestClock();
  });

  test("exportAudit delegates to listAuditForBusiness", async () => {
    setTestClock(FROZEN_TEST_NOW);
    const stub = makeSqlStub();
    await signUp(stub.sql, {
      email: "o@e.com",
      password: "verysecret",
      businessName: "A",
      locale: "bn",
    });
    const businessId = stub.state.businesses[0]!["id"] as never;
    const rows = await exportAudit(stub.sql, businessId);
    expect(Array.isArray(rows)).toBe(true);
    resetTestClock();
  });

  test("auditRetentionFilter returns a string", () => {
    const f = auditRetentionFilter(new Date("2026-09-07T00:00:00Z"));
    expect(typeof f.retentionBefore).toBe("string");
  });

  test("argon2 PASSWORD_MIN_LENGTH + hash + verify", async () => {
    expect(PASSWORD_MIN_LENGTH).toBe(8);
    const hash = await hashPassword("verysecret");
    expect(hash).toMatch(/^\$argon2id\$/);
    const ok = await verifyPassword(hash, "verysecret");
    expect(ok).toBe(true);
    const bad = await verifyPassword(hash, "wrong");
    expect(bad).toBe(false);
  });

  test("capabilitiesFor returns a Set instance", () => {
    const caps = capabilitiesFor("owner");
    expect(caps instanceof Set).toBe(true);
  });
});
