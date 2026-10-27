/**
 * src/server/cookies.ts — the session cookie (C1 cookie, amendment A1; BR3.2; NFR3.2).
 *
 * `__Host-sb_session`, always `Secure; HttpOnly; SameSite=Lax; Path=/` and no `Domain`: the
 * `__Host-` prefix makes browsers refuse the cookie unless it is exactly that. `Secure` is
 * never switched off — browsers treat `http://127.0.0.1` as a secure context (team.md Code
 * Style). `Max-Age` is the whole seconds left until the session's 30-day cap (A1); clearing
 * sends an empty value with `Max-Age=0`.
 */
export const SESSION_COOKIE = "__Host-sb_session";

const ATTRIBUTES = "Path=/; HttpOnly; Secure; SameSite=Lax";

export const sessionCookie = (token: string, expiresAt: Date, at: Date): string => {
  const maxAge = Math.max(0, Math.floor((expiresAt.getTime() - at.getTime()) / 1000));
  return `${SESSION_COOKIE}=${token}; Max-Age=${maxAge}; ${ATTRIBUTES}`;
};

export const clearSessionCookie = (): string => `${SESSION_COOKIE}=; Max-Age=0; ${ATTRIBUTES}`;

/** The session cookie's value from a `Cookie` header, or null when absent or empty. */
export const readSessionCookie = (header: string | null): string | null => {
  if (header === null) return null;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() !== SESSION_COOKIE) continue;
    const value = part.slice(eq + 1).trim();
    return value === "" ? null : value;
  }
  return null;
};
