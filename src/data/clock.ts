/**
 * src/data/clock.ts — frozen-clock helper for tests (TP-11).
 *
 * Production returns `new Date()`; tests call `setTestClock(...)`
 * with a deterministic value so seeded arithmetic is repeatable.
 *
 * Closure-private to prevent accidental global mutation.
 */
let testClock: Date | null = null;

export const now = (): Date => (testClock ? new Date(testClock.getTime()) : new Date());

export const setTestClock = (d: Date | null): void => {
  testClock = d === null ? null : new Date(d.getTime());
};

export const resetTestClock = (): void => {
  testClock = null;
};

export const FROZEN_TEST_NOW = new Date("2026-09-07T00:00:00Z");
