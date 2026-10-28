/**
 * tests/unit/hash-gate.test.ts — at most two password hashes at once (NFR6.12, scalability
 * S2).
 *
 * Restated: 2 permits; at most 20 waiting in arrival order; the 23rd concurrent request is
 * refused with rate_limited and Retry-After 5 s and its work never runs; a thrown error still
 * frees the permit. The work here is fake and controlled by the test, so no argon2 runs.
 */
import { describe, expect, test } from "bun:test";
import { createHashGate } from "../../src/auth/hash-gate.js";

/** A unit of work the test finishes by hand, recording how many run at once. */
const harness = () => {
  let running = 0;
  let peak = 0;
  const finish: Array<() => void> = [];
  const started: number[] = [];
  const work = (id: number) => (): Promise<number> =>
    new Promise<number>((resolve) => {
      running += 1;
      peak = Math.max(peak, running);
      started.push(id);
      finish.push(() => {
        running -= 1;
        resolve(id);
      });
    });
  return { work, finish, started, peak: () => peak };
};

const tick = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

describe("hash gate", () => {
  test("30 parallel requests: 2 run, 20 wait, 8 are refused", async () => {
    const gate = createHashGate();
    const h = harness();
    const all = Array.from({ length: 30 }, (_, i) => gate.run(h.work(i)));
    await tick();
    expect(gate.inFlight()).toBe(2);
    expect(gate.waiting()).toBe(20);
    const refused = await Promise.all(all.slice(22));
    for (const r of refused)
      expect(r).toEqual({ ok: false, error: { kind: "rate_limited", retryAfterMs: 5_000 } });
    while (h.finish.length > 0 || gate.inFlight() > 0) {
      h.finish.shift()?.();
      await tick();
    }
    const done = await Promise.all(all.slice(0, 22));
    expect(done.every((r) => r.ok)).toBe(true);
    expect(h.peak()).toBe(2);
    expect(h.started).toHaveLength(22);
  });

  test("waiters start in arrival order", async () => {
    const gate = createHashGate(1, 5);
    const h = harness();
    const runs = [0, 1, 2, 3].map((i) => gate.run(h.work(i)));
    await tick();
    for (let i = 0; i < 4; i++) {
      h.finish.shift()?.();
      await tick();
    }
    await Promise.all(runs);
    expect(h.started).toEqual([0, 1, 2, 3]);
  });

  test("a thrown error frees the permit and reaches the caller", async () => {
    const gate = createHashGate(1, 0);
    await expect(gate.run(() => Promise.reject(new Error("argon2 failed")))).rejects.toThrow(
      "argon2 failed",
    );
    expect(gate.inFlight()).toBe(0);
    expect(await gate.run(async () => 42)).toEqual({ ok: true, value: 42 });
  });

  test("with a free permit, work runs at once and returns its value", async () => {
    const gate = createHashGate();
    expect(await gate.run(async () => "hash")).toEqual({ ok: true, value: "hash" });
    expect(gate.inFlight()).toBe(0);
  });
});
