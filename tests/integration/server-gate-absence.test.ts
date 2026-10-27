/**
 * tests/integration/server-gate-absence.test.ts — the server twin of
 * three-layer-gate-absence.test.ts (team.md Testing Posture; NFR1.1, NFR1.2; BR6.1; R1.2).
 *
 * Once data comes over HTTP the client gate is advisory, so the server enforces the role
 * table on every call. This walks the server's REGISTERED route table, not a hand-kept list:
 *   - every registered route has a row in the restated reach table below, and every row
 *     names a registered route, so a new route cannot ship ungated or unreviewed;
 *   - outside the public allow-list, no cookie, an expired, an idle or an inactive user's
 *     session each give 401;
 *   - a role without the route's capability gets 403, and the body carries no money field;
 *   - a role with it gets past the gate (any status but 401 or 403).
 * The reach table is restated inline (C5 shape), never imported from src/auth.
 */
import { describe, expect, test } from "bun:test";
import { ROLES, type Role } from "../../src/data/enums.js";
import { routeKey, routes } from "../../src/server/routes.js";
import { makeSqlStub } from "../helpers/sql-stub.js";
import { harness, NOW, request, seedBusiness } from "../helpers/server-harness.js";

const PUBLIC = "public";
const ALL: ReadonlyArray<Role> = ["owner", "manager", "sales_staff", "accountant"];
const MUTATE: ReadonlyArray<Role> = ["owner", "manager", "sales_staff"];

const REACH: Readonly<Record<string, ReadonlyArray<Role> | typeof PUBLIC>> = {
  "GET /api/health": PUBLIC,
  "GET /api/setup": PUBLIC,
  "POST /api/auth/sign-up": PUBLIC,
  "POST /api/auth/sign-in": PUBLIC,
  "POST /api/auth/sign-out": PUBLIC,
  "GET /api/session": ALL,
  "GET /api/orders": ALL,
  "POST /api/orders": MUTATE,
  "GET /api/orders/:id": ALL,
  "PATCH /api/orders/:id": MUTATE,
  "POST /api/orders/:id/status": MUTATE,
  "POST /api/orders/:id/consignment": MUTATE,
};

const ID = "0f0f0f0f-0f0f-4f0f-8f0f-0f0f0f0f0f0f";
const concrete = (path: string): string => path.replace(":id", ID);
const HOUR = 60 * 60 * 1000;

/** True when any key anywhere in the body names money (…Paise) or a list of orders. */
const carriesMoney = (value: unknown): boolean => {
  if (Array.isArray(value)) return value.some(carriesMoney);
  if (value === null || typeof value !== "object") return false;
  return Object.entries(value).some(
    ([k, v]) => /paise$/i.test(k) || k === "orders" || carriesMoney(v),
  );
};

const gated = routes.filter((r) => REACH[routeKey(r)] !== PUBLIC);

describe("server gate by absence over the registered route table", () => {
  test("every registered route has a reviewed row, and every row is a registered route", () => {
    expect(routes.map(routeKey).sort()).toEqual(Object.keys(REACH).sort());
  });

  test("the public routes are exactly the allow-list", () => {
    const publicKeys = routes
      .filter((r) => r.access === "public")
      .map(routeKey)
      .sort();
    expect(publicKeys).toEqual(
      Object.entries(REACH)
        .filter(([, v]) => v === PUBLIC)
        .map(([k]) => k)
        .sort(),
    );
  });

  test("no cookie, or a forged one, gives 401 on every gated route", async () => {
    const h = harness();
    for (const route of gated) {
      for (const token of [null, "F".repeat(43)]) {
        const r = await h.send(request(route.method, concrete(route.path), { token }));
        expect({ key: routeKey(route), forged: token !== null, status: r.status }).toEqual({
          key: routeKey(route),
          forged: token !== null,
          status: 401,
        });
      }
    }
  });

  test("an expired, an idle or an inactive user's session gives 401 on every gated route", async () => {
    for (const situation of ["expired", "idle", "inactive"] as const) {
      const stub = makeSqlStub();
      const tokens = await seedBusiness(stub);
      if (situation === "inactive") stub.state.users[0]!["active"] = false;
      const later = situation === "expired" ? 30 * 24 * HOUR : situation === "idle" ? 12 * HOUR : 1;
      const h = harness(stub, { clock: () => new Date(NOW.getTime() + later) });
      for (const route of gated) {
        const r = await h.send(
          request(route.method, concrete(route.path), { token: tokens.owner }),
        );
        expect({ situation, key: routeKey(route), status: r.status }).toEqual({
          situation,
          key: routeKey(route),
          status: 401,
        });
      }
    }
  });

  test("each role is refused with 403 and no money exactly where the table says, and passes elsewhere", async () => {
    const stub = makeSqlStub();
    const tokens = await seedBusiness(stub);
    const h = harness(stub);
    for (const route of gated) {
      const reach = REACH[routeKey(route)];
      for (const role of ROLES) {
        const r = await h.send(
          request(route.method, concrete(route.path), { token: tokens[role] }),
        );
        const allowed = reach !== PUBLIC && (reach ?? []).includes(role);
        const body: unknown = r.status === 204 ? null : await r.json();
        const got = r.status === 403 ? "refused" : r.status === 401 ? "unauthenticated" : "passed";
        expect({ key: routeKey(route), role, got }).toEqual({
          key: routeKey(route),
          role,
          got: allowed ? "passed" : "refused",
        });
        if (!allowed)
          expect({ key: routeKey(route), role, money: carriesMoney(body) }).toEqual({
            key: routeKey(route),
            role,
            money: false,
          });
      }
    }
  });

  test("inverse: the Owner still reads and writes orders", async () => {
    const stub = makeSqlStub();
    const tokens = await seedBusiness(stub);
    const h = harness(stub);
    const list = await h.send(request("GET", "/api/orders", { token: tokens.owner }));
    expect(list.status).toBe(200);
    const session = await h.send(request("GET", "/api/session", { token: tokens.accountant }));
    expect(session.status).toBe(200);
  });
});
