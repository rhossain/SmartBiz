/**
 * tests/unit/deferred-input-logging.test.ts — R2.5 (NFR3.3; US1.14.D–US1.16.D).
 *
 * Each deferred placeholder returns `{ ok: false, reason: 'deferred' }`
 * and logs exactly one structured line:
 *   { event: 'deferred_input_invoked', source, actor_id, business_id,
 *     occurred_at, correlation_id }
 * The log sink is captured at process.stdout (the B1 logger's sink),
 * not mocked inside the module under test.
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { FROZEN_TEST_NOW, resetTestClock, setTestClock } from "../../src/data/clock.js";
import { photoOrder } from "../../src/orders/deferred/photo-order.js";
import { spreadsheetOrder } from "../../src/orders/deferred/spreadsheet-order.js";
import { voiceOrder } from "../../src/orders/deferred/voice-order.js";
import { BUSINESS_A, OWNER_A, ctxFor } from "../helpers/order-fixtures.js";

const captureStdout = async (
  fn: () => Promise<unknown>,
): Promise<Array<Record<string, unknown>>> => {
  const original = process.stdout.write.bind(process.stdout);
  const lines: string[] = [];
  process.stdout.write = ((chunk: string | Uint8Array) => {
    lines.push(typeof chunk === "string" ? chunk : new TextDecoder().decode(chunk));
    return true;
  }) as typeof process.stdout.write;
  try {
    await fn();
  } finally {
    process.stdout.write = original;
  }
  return lines.map((l) => JSON.parse(l) as Record<string, unknown>);
};

const bytes = new Uint8Array([1, 2, 3]);
const ctx = ctxFor(BUSINESS_A, OWNER_A);

beforeEach(() => setTestClock(FROZEN_TEST_NOW));
afterEach(() => resetTestClock());

describe("R2.5 — deferred input modes log and decline", () => {
  test("photo returns deferred and logs the full event shape", async () => {
    let result: unknown;
    const logged = await captureStdout(async () => {
      result = await photoOrder(ctx, { image: bytes, mimeType: "image/jpeg" });
    });
    expect(result).toEqual({ ok: false, reason: "deferred", source: "photo" });
    expect(logged).toEqual([
      {
        level: "info",
        message: "deferred_input_invoked",
        event: "deferred_input_invoked",
        source: "photo",
        actor_id: OWNER_A,
        business_id: BUSINESS_A,
        occurred_at: FROZEN_TEST_NOW.toISOString(),
        correlation_id: "test-correlation-0001",
      },
    ]);
  });

  test("spreadsheet returns deferred and logs source spreadsheet", async () => {
    let result: unknown;
    const logged = await captureStdout(async () => {
      result = await spreadsheetOrder(ctx, { file: bytes, fileName: "orders.xlsx" });
    });
    expect(result).toEqual({ ok: false, reason: "deferred", source: "spreadsheet" });
    expect(logged.length).toBe(1);
    expect(logged[0]).toMatchObject({
      event: "deferred_input_invoked",
      source: "spreadsheet",
      business_id: BUSINESS_A,
    });
  });

  test("voice returns deferred and logs source voice", async () => {
    let result: unknown;
    const logged = await captureStdout(async () => {
      result = await voiceOrder(ctx, { audio: bytes, mimeType: "audio/webm" });
    });
    expect(result).toEqual({ ok: false, reason: "deferred", source: "voice" });
    expect(logged[0]).toMatchObject({
      event: "deferred_input_invoked",
      source: "voice",
      actor_id: OWNER_A,
    });
  });

  test("a correlation id is generated when the context has none", async () => {
    const { correlationId: _omit, ...noCorrelation } = ctx;
    const logged = await captureStdout(async () => {
      await voiceOrder(noCorrelation, { audio: bytes, mimeType: "audio/webm" });
    });
    expect(typeof logged[0]!["correlation_id"]).toBe("string");
    expect(String(logged[0]!["correlation_id"]).length).toBeGreaterThan(0);
  });

  test("one line per call, each a single-line JSON object with every field present", async () => {
    const logged = await captureStdout(async () => {
      await photoOrder(ctx, { image: bytes, mimeType: "image/png" });
      await spreadsheetOrder(ctx, { file: bytes, fileName: "o.csv" });
      await voiceOrder(ctx, { audio: bytes, mimeType: "audio/ogg" });
    });
    expect(logged.map((l) => l["source"])).toEqual(["photo", "spreadsheet", "voice"]);
    for (const l of logged) {
      for (const key of [
        "event",
        "source",
        "actor_id",
        "business_id",
        "occurred_at",
        "correlation_id",
      ]) {
        expect({ key, present: l[key] !== undefined && l[key] !== null }).toEqual({
          key,
          present: true,
        });
      }
    }
  });
});
