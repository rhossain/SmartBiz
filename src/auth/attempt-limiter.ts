/**
 * src/auth/attempt-limiter.ts — fixed-window attempt limits per key (AuthComponent; S2;
 * BR4.2, NFR3.5, NFR6.11, T2, T8, T10). Replaces the per-IP token bucket of B1's
 * rate-limit.ts.
 *
 * Sign-in is limited per typed email (trimmed, lower-cased), not per IP: on a loopback
 * server every request comes from 127.0.0.1, so an IP key would lock out the whole shop.
 * Rules (BR4.2, restated):
 * - The window starts at the first attempt for a key and lasts `windowMs` (15 minutes for
 *   sign-in); it is fixed, not sliding.
 * - `reserve` checks and increments in one synchronous step, before any `await`, so
 *   parallel requests cannot all pass together. When the key already holds `max` reserved
 *   attempts (5 for sign-in), it refuses with the milliseconds left in the window.
 * - A success calls `clear`; a failure keeps its reservation. Known and unknown emails
 *   count the same, and the account is never disabled: the limit only delays.
 * - Memory is bounded (NFR6.11): expired keys are dropped when read; when a new key arrives
 *   at the cap (10 000), every expired key is swept, and if the map is still full the key
 *   with the earliest window end is dropped (a hard cap).
 * The state is in process memory, so it resets when the server restarts (accepted risk
 * SEC-R1) and is correct for one process only (scalability S4).
 */

export interface LimiterConfig {
  readonly max: number;
  readonly windowMs: number;
  readonly maxKeys?: number;
}

export type Reservation =
  { readonly ok: true } | { readonly ok: false; readonly retryAfterMs: number };

export interface AttemptLimiter {
  readonly reserve: (key: string, nowMs: number) => Reservation;
  readonly clear: (key: string) => void;
  readonly size: () => number;
  readonly reset: () => void;
}

interface Window {
  count: number;
  readonly windowEndsAt: number;
}

export const DEFAULT_MAX_KEYS = 10_000;

export const createAttemptLimiter = (config: LimiterConfig): AttemptLimiter => {
  const maxKeys = config.maxKeys ?? DEFAULT_MAX_KEYS;
  // A Map keeps insertion order; every new window is inserted at the end with a later end
  // time, so the first entry is always the one with the earliest window end.
  const windows = new Map<string, Window>();

  const makeRoom = (nowMs: number): void => {
    if (windows.size < maxKeys) return;
    for (const [key, w] of windows) if (w.windowEndsAt <= nowMs) windows.delete(key);
    while (windows.size >= maxKeys) {
      const oldest = windows.keys().next();
      if (oldest.done) return;
      windows.delete(oldest.value);
    }
  };

  const reserve = (key: string, nowMs: number): Reservation => {
    const current = windows.get(key);
    if (current && current.windowEndsAt > nowMs) {
      if (current.count >= config.max) {
        return { ok: false, retryAfterMs: current.windowEndsAt - nowMs };
      }
      current.count += 1;
      return { ok: true };
    }
    if (current) windows.delete(key);
    makeRoom(nowMs);
    windows.set(key, { count: 1, windowEndsAt: nowMs + config.windowMs });
    return { ok: true };
  };

  return {
    reserve,
    clear: (key) => {
      windows.delete(key);
    },
    size: () => windows.size,
    reset: () => windows.clear(),
  };
};

/** Sign-in: 5 attempts per typed email per fixed 15-minute window (BR4.2). */
export const SIGN_IN_LIMIT: LimiterConfig = { max: 5, windowMs: 15 * 60 * 1000 };

/** The sign-in key: the typed email, trimmed and lower-cased. */
export const signInKey = (email: string): string => email.trim().toLowerCase();

/**
 * The B1 flows that U3 rebuilds (recovery, invitation, accept) keep their B1 limits, now on
 * this limiter: recovery 3 per hour per email, invite 10 per hour per user, accept 5 per
 * 15 minutes per email hint. Each process holds one limiter per flow.
 */
export const flowLimiters = {
  recovery: createAttemptLimiter({ max: 3, windowMs: 60 * 60 * 1000 }),
  invite: createAttemptLimiter({ max: 10, windowMs: 60 * 60 * 1000 }),
  accept: createAttemptLimiter({ max: 5, windowMs: 15 * 60 * 1000 }),
} as const;

/** Empty every flow limiter (tests start each case from a clean window). */
export const resetFlowLimiters = (): void => {
  for (const limiter of Object.values(flowLimiters)) limiter.reset();
};
