/**
 * tests/unit/one-time-token.test.ts — the one shape of every invitation and reset token
 * (U3 S18; BR2.1, BR4.1, BR7.2; NFR3.16, NFR3.24; review D-05).
 *
 * Restated from the design rather than read from the module: a token is 32 random bytes as
 * unpadded base64url, so exactly 43 characters of `[A-Za-z0-9_-]`; what is stored is its
 * SHA-256 as 64 lower-case hex characters, the same digest `sha256.ts` gives (one helper);
 * the link is `http://127.0.0.1:<port>/#/<accept-invite|reset>?t=<token>`; a lifetime ends
 * exactly at its limit.
 */
import { describe, expect, test } from "bun:test";
import {
  hashToken,
  INVITATION_TTL_MS,
  isLive,
  isTokenShape,
  linkFor,
  newToken,
  RESET_TTL_MS,
} from "../../src/auth/one-time-token.js";
import { sha256 } from "../../src/auth/sha256.js";

describe("one-time tokens (S18)", () => {
  test("a token is 43 characters of base64url, and two tokens differ", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const t = newToken();
      expect(t).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(isTokenShape(t)).toBe(true);
      seen.add(t);
    }
    expect(seen.size).toBe(50);
  });

  test("the stored hash is SHA-256 hex from the one helper, never the token itself", async () => {
    const t = newToken();
    const h = await hashToken(t);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(h).toBe(await sha256(t));
    expect(h).not.toContain(t);
    // A known vector: SHA-256("abc").
    expect(await hashToken("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  test("the link names 127.0.0.1, the port, the screen route and the token in the fragment", () => {
    expect(linkFor("accept-invite", "TOKEN", 3000)).toBe(
      "http://127.0.0.1:3000/#/accept-invite?t=TOKEN",
    );
    expect(linkFor("reset", "TOKEN", 4123)).toBe("http://127.0.0.1:4123/#/reset?t=TOKEN");
  });

  test("anything but a 43-character base64url string is not a token", () => {
    for (const bad of ["", "x".repeat(42), "x".repeat(44), `${"x".repeat(42)}=`, "a.b"]) {
      expect({ bad, ok: isTokenShape(bad) }).toEqual({ bad, ok: false });
    }
  });

  test("lifetimes: 7 days and 30 minutes; exactly at the limit is expired (NFR3.24)", () => {
    expect(INVITATION_TTL_MS).toBe(7 * 24 * 60 * 60 * 1000);
    expect(RESET_TTL_MS).toBe(30 * 60 * 1000);
    const now = new Date("2026-10-28T10:00:00.000Z");
    expect(isLive(new Date(now.getTime() + 1), now)).toBe(true);
    expect(isLive(now, now)).toBe(false);
    expect(isLive(now.toISOString(), new Date(now.getTime() - 1))).toBe(true);
  });
});
