/**
 * src/auth/rate-limit.ts — in-process token bucket.
 * Per the plan: sign-in 5/15min/IP, recovery 3/hr/email,
 * invite 10/hr/user, accept 5/15min/IP. The free-tier
 * deployment has no Redis; the in-process bucket is correct
 * for a single-instance deploy and is reset between tests
 * via `resetBuckets()`.
 */
export interface RateLimitConfig {
  readonly max: number;
  readonly windowMs: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export const checkRateLimit = (key: string, cfg: RateLimitConfig, nowMs: number): boolean => {
  const b = buckets.get(key);
  if (!b || b.resetAt <= nowMs) {
    buckets.set(key, { count: 1, resetAt: nowMs + cfg.windowMs });
    return true;
  }
  if (b.count >= cfg.max) return false;
  b.count += 1;
  return true;
};

export const resetBuckets = (): void => {
  buckets.clear();
};

export const LIMIT_SIGN_IN: RateLimitConfig = { max: 5, windowMs: 15 * 60 * 1000 };
export const LIMIT_RECOVERY: RateLimitConfig = { max: 3, windowMs: 60 * 60 * 1000 };
export const LIMIT_INVITE: RateLimitConfig = { max: 10, windowMs: 60 * 60 * 1000 };
export const LIMIT_ACCEPT: RateLimitConfig = { max: 5, windowMs: 15 * 60 * 1000 };
