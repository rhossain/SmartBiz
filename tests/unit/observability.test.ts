/**
 * Coverage booster — observability + audit retention helper + role-grants import.
 */
import { describe, expect, test } from "bun:test";
import { info, warn, error } from "../../src/observability/log.js";
import { newCorrelationId } from "../../src/observability/correlation.js";
import { auditRetentionFilter } from "../../src/audit/audit-service.js";
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

  test("correlation ids are 16 hex characters from Web Crypto and differ per call (O2)", () => {
    const a = newCorrelationId();
    const b = newCorrelationId();
    expect(a).toMatch(/^[0-9a-f]{16}$/);
    expect(b).toMatch(/^[0-9a-f]{16}$/);
    expect(a).not.toBe(b);
  });

  // U2 (D-06): the `listAuditForBusiness` and `exportAudit` cases moved to
  // tests/unit/audit-read.test.ts and tests/unit/audit-export.test.ts.

  test("auditRetentionFilter returns a string", () => {
    const f = auditRetentionFilter(new Date("2026-09-07T00:00:00Z"));
    expect(typeof f.retentionBefore).toBe("string");
  });

  test("argon2 PASSWORD_MIN_LENGTH + hash + verify", async () => {
    expect(PASSWORD_MIN_LENGTH).toBe(10); // U1 BR2.4 (was 8 in B1)
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
