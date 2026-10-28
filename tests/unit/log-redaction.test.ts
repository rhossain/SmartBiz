/**
 * tests/unit/log-redaction.test.ts — the logger's deny-list (O3, O7; NFR3.7; team.md Code
 * Style "Logs are redacted").
 *
 * Restated deny-list, case-insensitive: password, passwordHash, password_hash, token,
 * token_hash, cookie, authorization, sessionId, link, t. Their values become "[redacted]" at
 * any depth up to 8, in arrays too; other keys are untouched; beyond depth 8 the whole value
 * is redacted. The written line is one JSON object with ts, level, message and a correlation
 * id, and never holds a deny-listed value.
 */
import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { resetTestClock, setTestClock } from "../../src/data/clock.js";
import { log, REDACTED, redact } from "../../src/observability/log.js";

const DENY = [
  "password",
  "passwordHash",
  "password_hash",
  "token",
  "token_hash",
  "cookie",
  "authorization",
  "sessionId",
  "link",
  "t",
];

describe("log redaction", () => {
  beforeEach(() => setTestClock(new Date("2026-10-27T09:00:00.000Z")));
  afterEach(() => resetTestClock());

  test("every deny-listed key is redacted, in any case", () => {
    for (const key of DENY) {
      for (const k of [key, key.toUpperCase()]) {
        expect(redact({ [k]: "s3cret", keep: 1 })).toEqual({ [k]: REDACTED, keep: 1 });
      }
    }
  });

  test("nested objects and arrays are redacted; dates and scalars pass through", () => {
    const when = new Date("2026-01-01T00:00:00.000Z");
    expect(
      redact({ a: { b: [{ token: "x" }, { cookie: "y", n: 2 }] }, when, s: "ok", n: null }),
    ).toEqual({
      a: { b: [{ token: REDACTED }, { cookie: REDACTED, n: 2 }] },
      when,
      s: "ok",
      n: null,
    });
  });

  test("anything deeper than eight levels is redacted whole", () => {
    let deep: unknown = { password: "x" };
    for (let i = 0; i < 10; i++) deep = { d: deep };
    expect(JSON.stringify(redact(deep))).not.toContain('"x"');
    expect(JSON.stringify(redact(deep))).toContain(REDACTED);
  });

  test("a written line is one JSON object with ts, level, message, correlation id, redacted", () => {
    const writes: string[] = [];
    const spy = spyOn(process.stdout, "write").mockImplementation((chunk: unknown) => {
      writes.push(String(chunk));
      return true;
    });
    try {
      log({ level: "warn", message: "x", authorization: "Bearer s3cret", nested: { t: "s3cret" } });
    } finally {
      spy.mockRestore();
    }
    expect(writes).toHaveLength(1);
    const line = writes[0] ?? "";
    expect(line.endsWith("\n")).toBe(true);
    const parsed = JSON.parse(line) as Record<string, unknown>;
    expect(parsed).toMatchObject({ ts: "2026-10-27T09:00:00.000Z", level: "warn", message: "x" });
    expect(String(parsed["correlation_id"])).toMatch(/^[0-9a-f]{16}$/);
    expect(line).not.toContain("s3cret");
  });
});
