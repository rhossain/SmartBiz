/**
 * tests/integration/server-gate-absence.test.ts — the server role walk, driven by the inline
 * role table (W5; BR3.1–BR3.3, BR3.5, BR3.6; S11; NFR1.4, NFR1.6, NFR1.7, NFR5.6; AC5.1.1–
 * AC5.1.3; team.md Testing Posture "role gate tested by absence, on the server"; R1.2).
 *
 * Once data comes over HTTP the client gate is advisory, so the server enforces the role
 * table on every call. This walks the server's REGISTERED route table (src/server/routes.ts),
 * not a hand-kept list, against the API rows of tests/spec/role-table.ts:
 *   - the two match exactly, in both directions; a new route without a row fails, naming it
 *     (BR3.2, scenario S9);
 *   - the public routes are exactly the public rows (C5 public_routes);
 *   - every non-public route answers 401 with no cookie, a forged one, and an expired, idle or
 *     inactive user's session (BR3.3);
 *   - each role outside a row gets 403 and no key ending in `Paise` anywhere in the body;
 *     each role inside gets neither 401 nor 403 (BR3.3). Write probes carry the exact Origin
 *     and a JSON content type and a body from tests/spec/fixtures.ts that satisfies the
 *     domain, so neither the CSRF check nor a domain refusal can mask the gate (D-09, F-07);
 *   - every POST / PATCH / DELETE refuses `text/plain`, a missing Origin and
 *     `http://localhost:<port>` with 403, even for the Owner (BR3.6, NFR5.6);
 *   - the Owner is never refused with 403 (BR3.5).
 * Each failure names the role, the route and the status (NFR8.14). The walk prints the rows,
 * roles, checks and milliseconds it covered (O12, NFR8.12); gate step 5b times it (NFR6.16).
 */
import { afterAll, describe, expect, test } from "bun:test";
import { routeKey, routes } from "../../src/server/routes.js";
import {
  API_ROWS,
  apiKey,
  diffKeys,
  isAllowed,
  reportWalk,
  ROLES,
  type ApiRow,
  type Role,
} from "../spec/role-table.js";
import { API_FIXTURES, ORDER_REQUEST, STAFF_TARGET_ID } from "../spec/fixtures.js";
import { makeSqlStub } from "../helpers/sql-stub.js";
import {
  harness,
  NOW,
  PORT,
  request,
  seedBusiness,
  type Harness,
} from "../helpers/server-harness.js";

const WALK = { timeout: 60_000 };
const HOUR = 60 * 60 * 1000;
const UNKNOWN_ID = "0f0f0f0f-0f0f-4f0f-8f0f-0f0f0f0f0f0f";
const WRITES = new Set(["POST", "PATCH", "DELETE"]);

const started = performance.now();
let checks = 0;
const check = (): void => {
  checks += 1;
};

const gatedRows = API_ROWS.filter((r) => r.allowed !== "public");
const writeRows = API_ROWS.filter((r) => WRITES.has(r.method));
/**
 * The row's path with its parameters filled: `:id` with an order, `:userId` (U3) with the
 * Sales Staff member, whom both the Owner and a Manager may reset (BR1.3), so an inside probe
 * answers its recorded success and never a delegation refusal (F-07).
 */
const concrete = (row: ApiRow, id: string): string =>
  row.path.replace(":id", id).replace(":userId", STAFF_TARGET_ID);
const bodyFor = (row: ApiRow): unknown => API_FIXTURES[apiKey(row)]?.request ?? {};

/** True when any key anywhere in the body names money (`…Paise`). */
const carriesMoney = (value: unknown): boolean => {
  if (Array.isArray(value)) return value.some(carriesMoney);
  if (value === null || typeof value !== "object") return false;
  return Object.entries(value).some(([k, v]) => /Paise$/.test(k) || carriesMoney(v));
};

/** One business with a user and live session per role, and one real order to walk with. */
const world = async (): Promise<{
  readonly h: Harness;
  readonly tokens: Readonly<Record<Role, string>>;
  readonly orderId: string;
}> => {
  const stub = makeSqlStub();
  const tokens = await seedBusiness(stub);
  const h = harness(stub);
  const created = await h.send(
    request("POST", "/api/orders", { token: tokens.owner, body: ORDER_REQUEST }),
  );
  if (created.status !== 201) throw new Error(`seed order failed: ${created.status}`);
  const { id } = (await created.json()) as { id: string };
  return { h, tokens, orderId: id };
};

afterAll(() => {
  reportWalk("server", API_ROWS.length, ROLES.length, checks, performance.now() - started);
});

describe("server role walk over the registered route table (role table, C5)", () => {
  test("the role table and the route table match exactly, both ways (BR3.2)", () => {
    const d = diffKeys(routes.map(routeKey), API_ROWS.map(apiKey));
    check();
    expect(d).toEqual({ missingRow: [], notRegistered: [] });
  });

  test("the public routes are exactly the public rows (C5 public_routes)", () => {
    const registered = routes
      .filter((r) => r.access === "public")
      .map(routeKey)
      .sort();
    check();
    expect(registered).toEqual(
      API_ROWS.filter((r) => r.allowed === "public")
        .map(apiKey)
        .sort(),
    );
  });

  test(
    "no cookie, a forged one, an expired, an idle or an inactive session: 401 everywhere gated",
    async () => {
      const { h, orderId } = await world();
      for (const row of gatedRows) {
        for (const token of [null, "F".repeat(43)]) {
          const r = await h.send(
            request(row.method, concrete(row, orderId), { token, body: bodyFor(row) }),
          );
          check();
          expect({ route: apiKey(row), forged: token !== null, status: r.status }).toEqual({
            route: apiKey(row),
            forged: token !== null,
            status: 401,
          });
        }
      }
      for (const situation of ["expired", "idle", "inactive"] as const) {
        const stub = makeSqlStub();
        const tokens = await seedBusiness(stub);
        if (situation === "inactive") {
          const owner = stub.state.users.find((u) => u["role"] === "owner");
          if (owner) owner["active"] = false;
        }
        const later =
          situation === "expired" ? 30 * 24 * HOUR : situation === "idle" ? 12 * HOUR : 1;
        const lateH = harness(stub, { clock: () => new Date(NOW.getTime() + later) });
        for (const row of gatedRows) {
          const r = await lateH.send(
            request(row.method, concrete(row, UNKNOWN_ID), {
              token: tokens.owner,
              body: bodyFor(row),
            }),
          );
          check();
          expect({ situation, route: apiKey(row), status: r.status }).toEqual({
            situation,
            route: apiKey(row),
            status: 401,
          });
        }
      }
    },
    WALK,
  );

  test(
    "each role: 403 and no money outside its row; the recorded success status inside (BR3.3)",
    async () => {
      const { h, tokens, orderId } = await world();
      // G-03: each inside probe gets its own order in a state its route accepts (a packed one
      // for linking a consignment), so a broken fixture or handler cannot hide behind "not
      // 401/403": the answer must be the fixture's recorded success status.
      const freshOrder = async (packed: boolean): Promise<string> => {
        const made = await h.send(
          request("POST", "/api/orders", { token: tokens.owner, body: ORDER_REQUEST }),
        );
        const { id } = (await made.json()) as { id: string };
        if (packed) {
          for (const to of ["confirmed", "packed"]) {
            await h.send(
              request("POST", `/api/orders/${id}/status`, { token: tokens.owner, body: { to } }),
            );
          }
        }
        return id;
      };
      let ref = 1000;
      for (const row of gatedRows) {
        for (const role of ROLES) {
          const inside = isAllowed(row.allowed, role);
          const linking = apiKey(row) === "POST /api/orders/:id/consignment";
          const id = inside && row.path.includes(":id") ? await freshOrder(linking) : orderId;
          // A consignment reference is unique per business: each link gets its own.
          ref += 1;
          const sent = linking ? { consignmentRef: `PT-${ref}` } : bodyFor(row);
          const r = await h.send(
            request(row.method, concrete(row, id), { token: tokens[role], body: sent }),
          );
          const body: unknown = r.status === 204 ? null : await r.json();
          const recorded = API_FIXTURES[apiKey(row)]?.status ?? -1;
          check();
          expect({ role, route: apiKey(row), status: r.status }).toEqual({
            role,
            route: apiKey(row),
            status: inside ? recorded : 403,
          });
          if (!inside) {
            check();
            expect({ role, route: apiKey(row), money: carriesMoney(body) }).toEqual({
              role,
              route: apiKey(row),
              money: false,
            });
          }
        }
      }
    },
    WALK,
  );

  test(
    "every write refuses text/plain, no Origin and localhost with 403, Owner included (BR3.6)",
    async () => {
      const { h, tokens, orderId } = await world();
      const probes = [
        { name: "text/plain", opts: { contentType: "text/plain" } },
        { name: "no Origin", opts: { origin: null } },
        { name: "localhost", opts: { origin: `http://localhost:${PORT}` } },
      ] as const;
      expect(writeRows.length).toBeGreaterThan(0);
      for (const row of writeRows) {
        for (const probe of probes) {
          const r = await h.send(
            request(row.method, concrete(row, orderId), {
              token: tokens.owner,
              body: bodyFor(row),
              ...probe.opts,
            }),
          );
          check();
          expect({ route: apiKey(row), probe: probe.name, status: r.status }).toEqual({
            route: apiKey(row),
            probe: probe.name,
            status: 403,
          });
        }
      }
    },
    WALK,
  );

  test(
    "inverse: the Owner is never refused with 403, the audit trail included (BR3.5)",
    async () => {
      const { h, tokens, orderId } = await world();
      for (const row of API_ROWS) {
        const r = await h.send(
          request(row.method, concrete(row, orderId), {
            token: row.allowed === "public" ? null : tokens.owner,
            body: bodyFor(row),
          }),
        );
        check();
        expect({ route: apiKey(row), status: r.status === 403 ? 403 : "not 403" }).toEqual({
          route: apiKey(row),
          status: "not 403",
        });
      }
      const audit = await h.send(request("GET", "/api/audit", { token: tokens.owner }));
      check();
      expect(audit.status).toBe(200);
    },
    WALK,
  );
});
