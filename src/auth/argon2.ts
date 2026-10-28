/**
 * src/auth/argon2.ts — argon2id password hashing (AuthComponent; S2; NFR3.1, NFR3.5, T15).
 *
 * Parameters per NFR3.1: m = 64 MiB, t = 3, p = 1. Passwords are at least 10 characters
 * (BR2.4, functional-design Q8). Every hash and verify should run through the hash gate
 * (hash-gate.ts), so at most two of these 64 MiB operations run at once (NFR6.12).
 *
 * `getDummyHash` is an argon2id hash of a random string, computed once per process. Sign-in
 * verifies an unknown email's password against it, so an unknown email costs the same time
 * as a wrong password and the response timing does not reveal which emails exist (T15).
 * Server-only: browser files may not import this module (BR7.1).
 */
import argon2 from "argon2";

const opts: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 65536, // 64 MiB
  timeCost: 3,
  parallelism: 1,
};

/** The minimum password length (BR2.4, NFR3.1). */
export const PASSWORD_MIN_LENGTH = 10;

export const hashPassword = async (password: string): Promise<string> =>
  argon2.hash(password, opts);

/**
 * True when `password` matches `hash`. A malformed hash is a mismatch, not an error: the
 * caller answers the same `invalid_credentials` either way (BR4.1).
 */
export const verifyPassword = async (hash: string, password: string): Promise<boolean> => {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
};

let dummyHash: Promise<string> | null = null;

/** The process-wide dummy hash for unknown emails (computed on first use, then reused). */
export const getDummyHash = (): Promise<string> => {
  dummyHash ??= hashPassword(globalThis.crypto.randomUUID());
  return dummyHash;
};
