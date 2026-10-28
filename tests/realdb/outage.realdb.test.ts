/**
 * tests/realdb/outage.realdb.test.ts — a database restart while the server runs (R1; BR1.5;
 * NFR7.1).
 *
 * The real server (startServer, Bun.serve on 127.0.0.1) runs against a fresh migrated
 * database as `smartbiz_app`. The throwaway container named by REALDB_CONTAINER is then
 * stopped: an API call answers 503 `db_unavailable` and `/api/health` still answers 200 with
 * `db: "down"`, so the process keeps running. The container is started again and, from the
 * moment `pg_isready` succeeds, the first successful call must come within 5 s with no
 * server restart (postgres.js reconnects on the next query).
 * U2 (R11, NFR7.14): `GET /api/audit` answers the same coded 503 during the outage, and the
 * same process serves it again afterwards.
 * U3 (R15, NFR7.19): `POST /api/invitations/accept` answers the same 503 during the outage and
 * leaves the token unused: the same link signs the invitee in once Postgres is back.
 * U4 (R19, NFR7.26): `GET /api/products` and `POST /api/customers` answer the same 503; no
 * customer was half-written, and the catalog serves again afterwards.
 *
 * It needs REALDB_CONTAINER (scripts/gate.ts sets it to the container it started); without
 * it, or without the realdb URLs, the file is skipped. It never touches any other container.
 */
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { readConfig } from "../../src/server/config.js";
import { startServer, type RunningServer } from "../../src/server/main.js";
import { freshDatabase, realdbEnabled, type FreshDatabase } from "./fresh-database.js";

const CONTAINER = process.env["REALDB_CONTAINER"];
const enabled = realdbEnabled && CONTAINER !== undefined && CONTAINER !== "";
const RECOVERY_BUDGET_MS = 5_000;

const docker = async (...args: string[]): Promise<number> => {
  const p = Bun.spawn(["docker", ...args], { stdout: "ignore", stderr: "ignore" });
  return p.exited;
};

const waitUntil = async (probe: () => Promise<boolean>, limitMs: number): Promise<boolean> => {
  const deadline = performance.now() + limitMs;
  while (performance.now() < deadline) {
    if (await probe()) return true;
    await Bun.sleep(100);
  }
  return false;
};

const freePort = (): number => {
  const probe = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch: () => new Response() });
  const port = probe.port ?? 0;
  void probe.stop(true);
  return port;
};

describe.skipIf(!enabled)("database outage and recovery", () => {
  let db: FreshDatabase;
  let server: RunningServer;
  let base = "";
  let cookie = "";

  beforeAll(async () => {
    db = await freshDatabase("outage");
    const port = freePort();
    const config = readConfig({ PORT: String(port), DATABASE_URL: db.appUrl });
    if (!config.ok) throw new Error(config.error);
    server = await startServer(config.value, { distDir: null });
    base = `http://127.0.0.1:${server.port}`;
    const up = await fetch(`${base}/api/auth/sign-up`, {
      method: "POST",
      headers: { Origin: base, "Content-Type": "application/json" },
      body: JSON.stringify({
        businessName: "Outage Test",
        email: "owner@outage.test",
        password: "correct-horse-1",
      }),
    });
    expect(up.status).toBe(201);
    cookie = (up.headers.get("Set-Cookie") ?? "").split(";")[0] ?? "";
  }, 60_000);

  afterAll(async () => {
    // Whatever happened, leave the container running for the files after this one.
    await docker("start", CONTAINER ?? "");
    await waitUntil(
      async () => (await docker("exec", CONTAINER ?? "", "pg_isready", "-U", "postgres")) === 0,
      30_000,
    );
    await server?.stop();
    await db?.drop();
  }, 60_000);

  const listOrders = () => fetch(`${base}/api/orders`, { headers: { Cookie: cookie } });
  const listAudit = () => fetch(`${base}/api/audit`, { headers: { Cookie: cookie } });
  const postJson = (path: string, body: unknown, withCookie = false) =>
    fetch(`${base}${path}`, {
      method: "POST",
      headers: {
        Origin: base,
        "Content-Type": "application/json",
        ...(withCookie ? { Cookie: cookie } : {}),
      },
      body: JSON.stringify(body),
    });

  test("503 while Postgres is down, health stays up, first success within 5 s of Postgres being back", async () => {
    expect((await listOrders()).status).toBe(200);
    // U3: an invitation issued before the outage.
    const invited = await postJson(
      "/api/staff/invitations",
      { email: "outage.staff@outage.test", role: "sales_staff" },
      true,
    );
    expect(invited.status).toBe(201);
    const token = /[?&]t=([A-Za-z0-9_-]+)/.exec(
      ((await invited.json()) as { link: string }).link,
    )?.[1];
    const acceptBody = { token, password: "correct-horse-9" };

    expect(await docker("stop", "-t", "5", CONTAINER ?? "")).toBe(0);
    const during = await listOrders();
    expect({ status: during.status, body: await during.json() }).toEqual({
      status: 503,
      body: { error: "db_unavailable" },
    });
    // U2 (R11, NFR7.14): the audit trail read answers the same coded 503 during the outage.
    const auditDuring = await listAudit();
    expect({ status: auditDuring.status, body: await auditDuring.json() }).toEqual({
      status: 503,
      body: { error: "db_unavailable" },
    });
    // U3 (R15, NFR7.19): accept answers the same coded 503; nothing commits.
    const acceptDuring = await postJson("/api/invitations/accept", acceptBody);
    expect({ status: acceptDuring.status, body: await acceptDuring.json() }).toEqual({
      status: 503,
      body: { error: "db_unavailable" },
    });
    // U4 (R19, NFR7.26): a catalog read and a catalog write answer the same coded 503.
    const productsDuring = await fetch(`${base}/api/products`, { headers: { Cookie: cookie } });
    expect({ status: productsDuring.status, body: await productsDuring.json() }).toEqual({
      status: 503,
      body: { error: "db_unavailable" },
    });
    const customerDuring = await postJson(
      "/api/customers",
      { name: "Outage", phone: "01712345678" },
      true,
    );
    expect({ status: customerDuring.status, body: await customerDuring.json() }).toEqual({
      status: 503,
      body: { error: "db_unavailable" },
    });
    const health = await fetch(`${base}/api/health`);
    expect({ status: health.status, body: await health.json() }).toEqual({
      status: 200,
      body: { status: "up", db: "down" },
    });

    expect(await docker("start", CONTAINER ?? "")).toBe(0);
    const ready = await waitUntil(
      async () => (await docker("exec", CONTAINER ?? "", "pg_isready", "-U", "postgres")) === 0,
      30_000,
    );
    expect(ready).toBe(true);
    const backAt = performance.now();
    const recovered = await waitUntil(
      async () => (await listOrders()).status === 200,
      RECOVERY_BUDGET_MS,
    );
    const elapsed = Math.round(performance.now() - backAt);
    expect({ recovered, withinBudget: elapsed <= RECOVERY_BUDGET_MS }).toEqual({
      recovered: true,
      withinBudget: true,
    });
    const after = await fetch(`${base}/api/health`);
    expect(await after.json()).toEqual({ status: "up", db: "up" });
    // The same process (never restarted) serves the audit trail again.
    expect((await listAudit()).status).toBe(200);
    // U4: nothing half-written by the refused write; the catalog serves again.
    const customers = await fetch(`${base}/api/customers`, { headers: { Cookie: cookie } });
    expect(((await customers.json()) as { total: number }).total).toBe(0);
    expect(
      (await postJson("/api/customers", { name: "After", phone: "01712345678" }, true)).status,
    ).toBe(201);
    // U3: the token was left unused by the outage — the same link now signs the invitee in.
    const acceptAfter = await postJson("/api/invitations/accept", acceptBody);
    expect(acceptAfter.status).toBe(201);
  }, 90_000);
});
