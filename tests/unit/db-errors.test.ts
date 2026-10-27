/**
 * tests/unit/db-errors.test.ts — outage versus defect, and what is logged (R1; BR1.5, BR1.11;
 * NFR7.1, NFR8.3).
 *
 * Restated classification: socket codes ECONNREFUSED, ECONNRESET, ETIMEDOUT, EPIPE; driver
 * codes CONNECT_TIMEOUT, CONNECTION_CLOSED, CONNECTION_ENDED, CONNECTION_DESTROYED; SQLSTATE
 * class 08 and 57P01–57P03 are availability errors. Anything else is a defect. The
 * description carries only class, SQLSTATE and constraint — never the message.
 */
import { describe, expect, test } from "bun:test";
import { describeError, isAvailabilityError } from "../../src/server/db-errors.js";

const withCode = (code: unknown): Error => Object.assign(new Error("boom"), { code });

describe("database error classification", () => {
  test("every availability code is an outage", () => {
    const codes = [
      "ECONNREFUSED",
      "ECONNRESET",
      "ETIMEDOUT",
      "EPIPE",
      "CONNECT_TIMEOUT",
      "CONNECTION_CLOSED",
      "CONNECTION_ENDED",
      "CONNECTION_DESTROYED",
      "08000",
      "08006",
      "08P01",
      "57P01",
      "57P02",
      "57P03",
    ];
    for (const code of codes) {
      expect({ code, outage: isAvailabilityError(withCode(code)) }).toEqual({ code, outage: true });
    }
  });

  test("defects and non-errors are not outages", () => {
    for (const e of [
      withCode("23505"),
      withCode("42501"),
      withCode("57014"),
      withCode("57P04"),
      withCode(8006),
      new Error("no code"),
      "a string",
      null,
      undefined,
    ]) {
      expect(isAvailabilityError(e)).toBe(false);
    }
  });

  test("the description keeps class, SQLSTATE and constraint, never the message", () => {
    const e = Object.assign(new TypeError("Key (lower(email))=(owner@acme.test) exists"), {
      code: "23505",
      constraint_name: "users_email_lower_unique_idx",
      detail: "owner@acme.test",
    });
    const d = describeError(e);
    expect(d).toEqual({
      error_class: "TypeError",
      sqlstate: "23505",
      constraint: "users_email_lower_unique_idx",
    });
    expect(JSON.stringify(d)).not.toContain("owner@acme.test");
  });

  test("odd throwables still get a class and nothing else", () => {
    expect(describeError("text")).toEqual({ error_class: "string" });
    expect(describeError(null)).toEqual({ error_class: "object" });
    expect(describeError(Object.create(null))).toEqual({ error_class: "Object" });
  });
});
