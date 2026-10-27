/**
 * tests/helpers/auth-fixtures.ts — fresh auth dependencies per test (U1).
 *
 * Sign-up and sign-in take their attempt limiter and hash gate as dependencies instead of
 * reading process-wide singletons, so each test builds its own and no test can inherit
 * another's counts or permits.
 */
import { createAttemptLimiter, SIGN_IN_LIMIT } from "../../src/auth/attempt-limiter.js";
import { createHashGate } from "../../src/auth/hash-gate.js";
import type { SignInDeps } from "../../src/auth/sign-in.js";

export const authDeps = (): SignInDeps => ({
  limiter: createAttemptLimiter(SIGN_IN_LIMIT),
  hashGate: createHashGate(),
});

export const OWNER_EMAIL = "owner@example.com";
/** Exactly 10 characters: the shortest password U1 accepts (BR2.4). */
export const OWNER_PASSWORD = "verysecret";
