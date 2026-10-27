/**
 * tests/unit/status-map.test.ts — the total kind → status mapping (C1 status table, amendment
 * A2; BR1.10).
 *
 * The C1 table is restated inline, and the test checks the mapping is total over
 * ERROR_KINDS, matches row for row, and that an unknown kind (which TypeScript would refuse)
 * throws rather than defaulting to some status.
 */
import { describe, expect, test } from "bun:test";
import { ERROR_KINDS, type ErrorKind } from "../../src/data/error-kinds.js";
import { statusFor } from "../../src/server/status-map.js";

const C1: Readonly<Record<string, number>> = {
  invalid_input: 400,
  invalid_email: 400,
  password_too_short: 400,
  invalid_credentials: 401,
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  already_linked: 409,
  not_editable: 409,
  invalid_transition: 409,
  business_exists: 409,
  email_taken: 409,
  gone: 410,
  payload_too_large: 413,
  rate_limited: 429,
  internal: 500,
  db_unavailable: 503,
};

describe("status map", () => {
  test("the kinds are exactly the C1 rows", () => {
    expect<string[]>([...ERROR_KINDS].sort()).toEqual(Object.keys(C1).sort());
  });

  test("every kind maps to its C1 status", () => {
    for (const kind of ERROR_KINDS) {
      expect<{ kind: string; status: number | undefined }>({
        kind,
        status: statusFor(kind),
      }).toEqual({ kind, status: C1[kind] });
    }
  });

  test("an unknown kind throws instead of picking a status", () => {
    expect(() => statusFor("teapot" as ErrorKind)).toThrow();
  });
});
