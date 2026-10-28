/**
 * tests/unit/smoke.test.ts — the post-merge smoke steps (cicd-pipeline.md "Post-merge smoke";
 * U3 review I-04).
 *
 * `runSmoke` runs against the real request pipeline in process (the SQL stub, a temporary
 * `dist/` holding BUILD_SHA): build-sha equals HEAD, health is up/up, the Owner signs in, the
 * orders list and — U3 — the staff list answer 200, sign-out answers 204 and the old cookie
 * then answers 401. It stops at the first failing step and names it: a stale build, and a
 * staff route that refuses the Owner, are both caught.
 */
import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { hashPassword } from "../../src/auth/argon2.js";
import type { RouteDef } from "../../src/server/types.js";
import { routes } from "../../src/server/routes.js";
import { runSmoke } from "../../scripts/smoke.js";
import { harness, HOST, ORIGIN, seedBusiness } from "../helpers/server-harness.js";
import { makeSqlStub } from "../helpers/sql-stub.js";

const HEAD = "0123456789abcdef0123456789abcdef01234567";
const PASSWORD = "smoke-test-pass-1";

const dirs: string[] = [];
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

const world = async (table?: ReadonlyArray<RouteDef>) => {
  const dist = mkdtempSync(join(tmpdir(), "smartbiz-smoke-"));
  dirs.push(dist);
  writeFileSync(join(dist, "BUILD_SHA"), `${HEAD}\n`);
  const stub = makeSqlStub();
  await seedBusiness(stub);
  const owner = stub.state.users.find((u) => u["role"] === "owner");
  if (owner) owner["password_hash"] = await hashPassword(PASSWORD);
  const h = harness(stub, { distDir: dist, clock: () => new Date() });
  const inProcess = (async (input: string | URL | Request, init: RequestInit = {}) => {
    const headers = new Headers(init.headers ?? {});
    headers.set("Host", HOST);
    return h.send(new Request(String(input), { ...init, headers }), table);
  }) as typeof fetch;
  return { fetch: inProcess };
};

describe("runSmoke (I-04)", () => {
  test("every step passes, the staff list included", async () => {
    const w = await world();
    const r = await runSmoke({
      base: ORIGIN,
      head: HEAD,
      email: "owner@acme.test",
      password: PASSWORD,
      fetch: w.fetch,
    });
    expect(r).toEqual({
      ok: true,
      line: `smoke ok: ${HEAD.slice(0, 12)} on ${ORIGIN} (build-sha, health, sign-in, orders, staff, products, low stock, sign-out)`,
    });
  });

  test("a stale build stops at the first step", async () => {
    const w = await world();
    const r = await runSmoke({
      base: ORIGIN,
      head: "f".repeat(40),
      email: "owner@acme.test",
      password: PASSWORD,
      fetch: w.fetch,
    });
    expect(r.ok ? "ok" : r.at).toMatch(/^\/build-sha is /);
  });

  test("a staff route that refuses the Owner is caught (U3 step)", async () => {
    const refusing = routes.map((r) =>
      r.path === "/api/staff" && r.method === "GET"
        ? ({ ...r, handler: async () => ({ kind: "error", error: "forbidden" }) } as RouteDef)
        : r,
    );
    const w = await world(refusing);
    const r = await runSmoke({
      base: ORIGIN,
      head: HEAD,
      email: "owner@acme.test",
      password: PASSWORD,
      fetch: w.fetch,
    });
    expect(r).toEqual({ ok: false, at: "GET /api/staff answered 403" });
  });

  test("a catalog read that refuses the Owner is caught (U4 step)", async () => {
    const refusing = routes.map((r) =>
      r.path === "/api/low-stock" && r.method === "GET"
        ? ({ ...r, handler: async () => ({ kind: "error", error: "forbidden" }) } as RouteDef)
        : r,
    );
    const w = await world(refusing);
    const r = await runSmoke({
      base: ORIGIN,
      head: HEAD,
      email: "owner@acme.test",
      password: PASSWORD,
      fetch: w.fetch,
    });
    expect(r).toEqual({ ok: false, at: "GET /api/low-stock answered 403" });
  });

  test("a wrong password stops at sign-in", async () => {
    const w = await world();
    const r = await runSmoke({
      base: ORIGIN,
      head: HEAD,
      email: "owner@acme.test",
      password: "wrong-pass-12",
      fetch: w.fetch,
    });
    expect(r).toEqual({ ok: false, at: "sign-in answered 401" });
  });
});
