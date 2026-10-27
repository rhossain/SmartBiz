/**
 * src/auth/argon2.ts — argon2id wrapper.
 * Per NFR5.2: m=64MB, t=3, p=1 (NIST-recommended; conservative for
 * a free-tier managed deployment).
 */
import argon2 from "argon2";

const opts: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 65536, // 64 MiB
  timeCost: 3,
  parallelism: 1,
};

export const hashPassword = async (password: string): Promise<string> => {
  return argon2.hash(password, opts);
};

export const verifyPassword = async (hash: string, password: string): Promise<boolean> => {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
};

/** Default minimum password length. Enforced by the business layer. */
export const PASSWORD_MIN_LENGTH = 8;
