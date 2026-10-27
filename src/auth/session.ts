/**
 * src/auth/session.ts — session create + cookie.
 *
 * Cookie: HttpOnly, Secure, SameSite=Lax, 30 days rolling
 * (NFR5.5). Re-issue on activity.
 */
import { uuid, type Uuid } from "../data/uuid.js";
import { now } from "../data/clock.js";

const SESSION_DAYS = 30;

export interface CreateSessionInput {
  readonly userId: Uuid;
  readonly businessId: Uuid;
}

export interface CreatedSession {
  readonly id: Uuid;
  readonly expiresAt: Date;
}

export const buildSession = (_input: CreateSessionInput): CreatedSession => {
  const issuedAt = now();
  const expiresAt = new Date(issuedAt.getTime() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  return { id: uuid(), expiresAt };
};

export interface CookieOptions {
  readonly httpOnly: true;
  readonly secure: true;
  readonly sameSite: "Lax";
  readonly path: "/";
  readonly maxAge: number;
}

export const cookieOptions = (expiresAt: Date): CookieOptions => ({
  httpOnly: true,
  secure: true,
  sameSite: "Lax",
  path: "/",
  maxAge: Math.max(0, Math.floor((expiresAt.getTime() - now().getTime()) / 1000)),
});

export const buildSetCookie = (name: string, value: string, opts: CookieOptions): string => {
  const parts = [`${name}=${value}`];
  parts.push(`Max-Age=${opts.maxAge}`);
  parts.push(`Path=${opts.path}`);
  parts.push("HttpOnly");
  parts.push("Secure");
  parts.push("SameSite=Lax");
  return parts.join("; ");
};
