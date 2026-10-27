/**
 * tests/unit/server-bind.test.ts — the real listener binds 127.0.0.1 only (BR1.1, NFR5.3;
 * review C-01).
 *
 * Restated contract: `startServer` opens bun's listener on the loopback address 127.0.0.1,
 * never 0.0.0.0 or another interface, whatever the configuration says. The role check runs
 * against a stub connection that answers as a non-superuser member of app_role, so no
 * database is needed; port 0 lets the OS pick a free port.
 */
import { afterEach, describe, expect, test } from "bun:test";
import type { Sql } from "../../src/db/client.js";
import { startServer, type RunningServer } from "../../src/server/main.js";

const stubSql = (): Sql => {
  const query = async (): Promise<unknown[]> => [
    { user: "smartbiz_app", super: false, member: true },
  ];
  return Object.assign(query, { end: async (): Promise<void> => {} }) as unknown as Sql;
};

let running: RunningServer | null = null;

afterEach(async () => {
  await running?.stop();
  running = null;
});

describe("server listener", () => {
  test("binds 127.0.0.1 and answers there", async () => {
    running = await startServer(
      { port: 0, databaseUrl: "postgres://smartbiz_app@127.0.0.1:5432/smartbiz" },
      { sql: stubSql(), distDir: null },
    );
    expect(running.hostname).toBe("127.0.0.1");
    expect(running.port).toBeGreaterThan(0);
    const res = await fetch(`http://127.0.0.1:${running.port}/api/does-not-exist`);
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  test("refuses to start when the stub answers as a superuser", async () => {
    const su = Object.assign(
      async (): Promise<unknown[]> => [{ user: "postgres", super: true, member: true }],
      { end: async (): Promise<void> => {} },
    ) as unknown as Sql;
    await expect(
      startServer(
        { port: 0, databaseUrl: "postgres://postgres@127.0.0.1/s" },
        { sql: su, distDir: null },
      ),
    ).rejects.toThrow("superuser");
  });
});
