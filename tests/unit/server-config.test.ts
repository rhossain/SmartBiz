/**
 * tests/unit/server-config.test.ts — start-up configuration fails fast (W1; BR1.1, BR1.3;
 * NFR2.3, NFR7.4).
 *
 * Restated contract: PORT defaults to 3000 and must be an integer 1–65535; DATABASE_URL must
 * be a postgres:// or postgresql:// URL; MIGRATE_DATABASE_URL in the server's environment is
 * a refusal; the bind host is the constant 127.0.0.1; no refusal prints the URL's password.
 */
import { describe, expect, test } from "bun:test";
import { BIND_HOST, expectedHost, expectedOrigin, readConfig } from "../../src/server/config.js";

const URL_OK = "postgres://smartbiz_app:pw-not-printed@127.0.0.1:5432/smartbiz";

describe("server configuration", () => {
  test("defaults the port to 3000 and binds 127.0.0.1 only", () => {
    const r = readConfig({ DATABASE_URL: URL_OK });
    expect(r).toEqual({ ok: true, value: { port: 3000, databaseUrl: URL_OK } });
    expect(BIND_HOST).toBe("127.0.0.1");
    expect(expectedOrigin(3000)).toBe("http://127.0.0.1:3000");
    expect(expectedHost(4100)).toBe("127.0.0.1:4100");
  });

  test("accepts postgresql:// and an explicit port", () => {
    const r = readConfig({ PORT: "8080", DATABASE_URL: "postgresql://a:b@127.0.0.1/x" });
    expect(r.ok && r.value.port).toBe(8080);
  });

  test("refuses a bad port", () => {
    for (const PORT of ["0", "65536", "abc", "30.5", "-1", "", "123456"]) {
      const r = readConfig({ PORT, DATABASE_URL: URL_OK });
      expect({ PORT, r }).toEqual({
        PORT,
        r: { ok: false, error: "PORT must be an integer from 1 to 65535" },
      });
    }
  });

  test("refuses a missing, invalid or non-postgres DATABASE_URL without echoing it", () => {
    const cases: Array<[string | undefined, string]> = [
      [undefined, "DATABASE_URL is not set"],
      ["", "DATABASE_URL is not set"],
      ["not a url pw-not-printed", "DATABASE_URL is not a valid URL"],
      ["mysql://u:pw-not-printed@127.0.0.1/x", "DATABASE_URL must be a postgres:// URL"],
    ];
    for (const [DATABASE_URL, message] of cases) {
      const env: Record<string, string | undefined> = { DATABASE_URL };
      const r = readConfig(env);
      expect(r).toEqual({ ok: false, error: message });
      expect(JSON.stringify(r)).not.toContain("pw-not-printed");
    }
  });

  test("refuses to start when the admin URL is in its environment", () => {
    const r = readConfig({ DATABASE_URL: URL_OK, MIGRATE_DATABASE_URL: URL_OK });
    expect(r.ok).toBe(false);
    expect(JSON.stringify(r)).toContain("MIGRATE_DATABASE_URL");
    expect(JSON.stringify(r)).not.toContain("pw-not-printed");
  });
});
