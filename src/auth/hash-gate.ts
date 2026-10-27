/**
 * src/auth/hash-gate.ts — at most two password hashes at once (AuthComponent; scalability
 * design S2; NFR6.12, T9).
 *
 * argon2id with m = 64 MiB is deliberately expensive. Without a bound, a flood of sign-ins
 * would allocate 64 MiB per request until the process runs out of memory. The gate is a
 * counting semaphore with 2 permits and a FIFO queue of at most 20 waiters; a request that
 * finds the queue full is refused with `rate_limited` (an existing kind, so the client shows
 * "try again shortly", not "database not reachable"), with `Retry-After: 5` seconds.
 *
 *   run(work): permit free  → take it, run work, release
 *              queue < 20   → wait in line; the releasing request hands its permit over
 *              queue full   → rate_limited, work never runs
 *
 * An error thrown by `work` still releases the permit and is rethrown to the caller.
 */
import { err, ok, type Result } from "../data/result.js";

export const HASH_GATE_PERMITS = 2;
export const HASH_GATE_QUEUE = 20;
/** Retry-After for a full queue: 5 seconds (NFR6.12). */
export const HASH_GATE_RETRY_AFTER_MS = 5_000;

export type HashGateFull = { readonly kind: "rate_limited"; readonly retryAfterMs: number };

export interface HashGate {
  readonly run: <T>(work: () => Promise<T>) => Promise<Result<T, HashGateFull>>;
  readonly inFlight: () => number;
  readonly waiting: () => number;
}

export const createHashGate = (
  permits: number = HASH_GATE_PERMITS,
  queueLimit: number = HASH_GATE_QUEUE,
): HashGate => {
  let free = permits;
  const waiters: Array<() => void> = [];

  const release = (): void => {
    const next = waiters.shift();
    if (next) next();
    else free += 1;
  };

  const run = async <T>(work: () => Promise<T>): Promise<Result<T, HashGateFull>> => {
    if (free > 0) {
      free -= 1;
    } else if (waiters.length < queueLimit) {
      await new Promise<void>((resolve) => waiters.push(resolve));
    } else {
      return err({ kind: "rate_limited", retryAfterMs: HASH_GATE_RETRY_AFTER_MS });
    }
    try {
      return ok(await work());
    } finally {
      release();
    }
  };

  return {
    run,
    inFlight: () => permits - free,
    waiting: () => waiters.length,
  };
};
