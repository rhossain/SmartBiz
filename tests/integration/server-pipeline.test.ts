/**
 * tests/integration/server-pipeline.test.ts — the request pipeline end to end without a port
 * (W2; S1, S7; BR1.5, BR1.8–BR1.11, BR3.8, BR6.4; NFR5.1, NFR5.2, NFR5.5; AC2.1a.3,
 * AC2.1a.4).
 *
 * The C1 status table is restated inline and checked for every kind through a test route
 * table, so the mapping cannot drift from the contract. The rest drives the real route
 * table with the SQL stub: Host, size, Origin and content-type refusals; 404; strict parsing
 * with field paths; smuggled role or business ids; Retry-After; and thrown errors.
 */
import { describe, expect, test } from "bun:test";
import { ERROR_KINDS, type ErrorKind } from "../../src/data/error-kinds.js";
import { defineRoute, type RouteDef } from "../../src/server/types.js";
import { makeSqlStub } from "../helpers/sql-stub.js";
import { harness, json, request, seedBusiness } from "../helpers/server-harness.js";

const C1: Readonly<Record<ErrorKind, number>> = {
  invalid_input: 400,
  invalid_email: 400,
  password_too_short: 400,
  invalid_credentials: 401,
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  already_linked: 409,
  not_editable: 409,
  invalid_transition: 409,
  insufficient_stock: 409,
  business_exists: 409,
  email_taken: 409,
  gone: 410,
  payload_too_large: 413,
  rate_limited: 429,
  internal: 500,
  db_unavailable: 503,
};

const kindTable: ReadonlyArray<RouteDef> = ERROR_KINDS.map((kind) =>
  defineRoute({
    method: "GET",
    path: `/api/kind/${kind}`,
    access: "public",
    schemas: {},
    handler: async () => ({
      kind: "error",
      error: kind,
      ...(kind === "rate_limited" ? { retryAfterMs: 125_000 } : {}),
    }),
  }),
);

const throwing = (error: unknown): ReadonlyArray<RouteDef> => [
  defineRoute({
    method: "GET",
    path: "/api/boom",
    access: "public",
    schemas: {},
    handler: async () => {
      throw error;
    },
  }),
];

const validOrder = {
  source: "manual",
  customerId: null,
  contact: null,
  repeatOfOrderId: null,
  items: [
    {
      variantId: null,
      description: "কুর্তি",
      quantity: 1,
      unitPricePaise: 1000,
      lineDiscountPaise: 0,
    },
  ],
  orderDiscountPaise: 0,
  deliveryChargePaise: 0,
};

describe("request pipeline", () => {
  test("every error kind maps to exactly its C1 status, and goes on the wire unchanged", async () => {
    const h = harness();
    expect<string[]>([...ERROR_KINDS].sort()).toEqual(Object.keys(C1).sort());
    for (const kind of ERROR_KINDS) {
      const r = await h.send(request("GET", `/api/kind/${kind}`), kindTable);
      const body = await json(r);
      expect({ kind, status: r.status, error: body["error"] }).toEqual({
        kind,
        status: C1[kind],
        error: kind,
      });
    }
  });

  test("429 carries Retry-After in seconds and retryAfterMinutes in the body", async () => {
    const r = await harness().send(request("GET", "/api/kind/rate_limited"), kindTable);
    expect(r.headers.get("Retry-After")).toBe("125");
    expect((await json(r))["retryAfterMinutes"]).toBe(3);
  });

  test("a Host other than 127.0.0.1:PORT is refused before routing (NFR5.5)", async () => {
    const h = harness();
    for (const host of ["localhost:3000", "evil.example:3000", "127.0.0.1:3001", null]) {
      const r = await h.send(request("GET", "/api/health", { host }));
      expect({ host, status: r.status }).toEqual({ host, status: 403 });
    }
    expect((await h.send(request("GET", "/api/health"))).status).toBe(200);
  });

  test("a write without the exact Origin or a JSON content type is 403 (NFR5.1)", async () => {
    const h = harness();
    const cases = [
      { origin: null },
      { origin: "http://localhost:3000" },
      { origin: "http://127.0.0.1:3000.evil.example" },
      { contentType: "text/plain" },
      { contentType: null },
    ];
    for (const c of cases) {
      const r = await h.send(request("POST", "/api/auth/sign-out", c));
      expect({ c, status: r.status, body: await json(r) }).toEqual({
        c,
        status: 403,
        body: { error: "forbidden" },
      });
    }
    const ok = await h.send(
      request("POST", "/api/auth/sign-out", { contentType: "application/json; charset=utf-8" }),
    );
    expect(ok.status).toBe(204);
  });

  test("a body over 64 KiB is 413, declared or actual", async () => {
    const h = harness();
    const declared = await h.send(
      request("POST", "/api/auth/sign-in", { headers: { "Content-Length": "70000" } }),
    );
    expect(declared.status).toBe(413);
    const actual = await h.send(
      request("POST", "/api/auth/sign-in", {
        rawBody: JSON.stringify({ email: "x".repeat(70_000) }),
      }),
    );
    expect({ status: actual.status, body: await json(actual) }).toEqual({
      status: 413,
      body: { error: "payload_too_large" },
    });
  });

  test("an unknown route is 404 not_found; malformed JSON is 400", async () => {
    const h = harness();
    expect((await h.send(request("GET", "/api/nope"))).status).toBe(404);
    expect((await h.send(request("PATCH", "/api/health"))).status).toBe(404);
    const bad = await h.send(request("POST", "/api/auth/sign-in", { rawBody: "{not json" }));
    expect((await json(bad))["error"]).toBe("invalid_input");
  });

  test("strict parsing answers 400 with every refused field's path (BR6.4)", async () => {
    const stub = makeSqlStub();
    const tokens = await seedBusiness(stub);
    const h = harness(stub);
    const r = await h.send(
      request("POST", "/api/orders", {
        token: tokens.owner,
        body: {
          ...validOrder,
          items: [{ ...validOrder.items[0], quantity: "two", colour: "red" }],
        },
      }),
    );
    const body = await json(r);
    expect(r.status).toBe(400);
    expect(body["error"]).toBe("invalid_input");
    const paths = (body["fields"] as Array<{ path: string }>).map((f) => f.path).sort();
    expect(paths).toEqual(["items.0.colour", "items.0.quantity"]);
    expect(stub.state.orders).toHaveLength(0);
  });

  test("a body carrying role, businessId or userId is refused, never obeyed (BR3.8)", async () => {
    const stub = makeSqlStub();
    const tokens = await seedBusiness(stub);
    const h = harness(stub);
    const asAccountant = await h.send(
      request("POST", "/api/orders", {
        token: tokens.sales_staff,
        body: { ...validOrder, role: "owner", businessId: "b0000000-0000-4000-8000-00000000000b" },
      }),
    );
    const paths = ((await json(asAccountant))["fields"] as Array<{ path: string }>).map(
      (f) => f.path,
    );
    expect(asAccountant.status).toBe(400);
    expect(paths.sort()).toEqual(["businessId", "role"]);
    const signIn = await h.send(
      request("POST", "/api/auth/sign-in", {
        body: { email: "a@b.cd", password: "x", userId: "u" },
      }),
    );
    expect(signIn.status).toBe(400);
  });

  test("an unexpected query parameter on a route with no query is 400", async () => {
    const r = await harness().send(request("GET", "/api/health?debug=1"));
    expect(r.status).toBe(400);
  });

  test("a thrown defect is a 500 with only the code and the correlation id; logged without its message", async () => {
    const h = harness();
    const secretish = Object.assign(new Error("Key (lower(email))=(owner@acme.test) exists"), {
      code: "23505",
      constraint_name: "users_email_lower_unique_idx",
    });
    const r = await h.send(request("GET", "/api/boom"), throwing(secretish));
    const body = await json(r);
    expect(r.status).toBe(500);
    expect(body).toEqual({ error: "internal", correlationId: r.headers.get("X-Correlation-Id") });
    const line = h.logs.find((l) => l.message === "internal_error");
    expect(line).toMatchObject({
      level: "error",
      sqlstate: "23505",
      constraint: "users_email_lower_unique_idx",
    });
    expect(JSON.stringify(h.logs)).not.toContain("owner@acme.test");
  });

  test("a database outage is 503 db_unavailable, logged at warn (BR1.5)", async () => {
    const h = harness();
    const down = Object.assign(new Error("connect ECONNREFUSED 127.0.0.1:5432"), {
      code: "ECONNREFUSED",
    });
    const r = await h.send(request("GET", "/api/boom"), throwing(down));
    expect({ status: r.status, body: await json(r) }).toEqual({
      status: 503,
      body: { error: "db_unavailable" },
    });
    expect(h.logs.find((l) => l.message === "db_unavailable")?.level).toBe("warn");
  });

  test("one request line per API call: the route pattern, never the raw path or a body", async () => {
    const stub = makeSqlStub();
    const tokens = await seedBusiness(stub);
    const h = harness(stub);
    await h.send(
      request("GET", "/api/orders/0f0f0f0f-0f0f-4f0f-8f0f-0f0f0f0f0f0f", { token: tokens.owner }),
    );
    const lines = h.logs.filter((l) => l.message === "request");
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      method: "GET",
      route: "/api/orders/:id",
      status: 404,
      role: "owner",
    });
    expect(JSON.stringify(lines[0])).not.toContain("0f0f0f0f-0f0f");
    expect(JSON.stringify(lines[0])).not.toContain(tokens.owner);
  });

  test("sign-in limits answer 429 with Retry-After after five failures (BR4.2)", async () => {
    const stub = makeSqlStub();
    await seedBusiness(stub);
    const h = harness(stub);
    const attempt = () =>
      h.send(
        request("POST", "/api/auth/sign-in", {
          body: { email: "owner@acme.test", password: "wrong-wrong" },
        }),
      );
    for (let i = 0; i < 5; i++) expect((await attempt()).status).toBe(401);
    const limited = await attempt();
    expect(limited.status).toBe(429);
    expect(limited.headers.get("Retry-After")).toBe("900");
    expect((await json(limited))["retryAfterMinutes"]).toBe(15);
    expect(h.logs.some((l) => l.message === "sign_in_limited")).toBe(true);
  });

  test("every failed sign-in gets the byte-identical 401 body (BR4.1)", async () => {
    const stub = makeSqlStub();
    await seedBusiness(stub);
    stub.state.users[1]!["active"] = false;
    const h = harness(stub);
    const bodies = new Set<string>();
    for (const email of ["owner@acme.test", "nobody@acme.test", "manager@acme.test"]) {
      const r = await h.send(
        request("POST", "/api/auth/sign-in", { body: { email, password: "not-the-password" } }),
      );
      expect(r.status).toBe(401);
      bodies.add(await r.text());
    }
    expect([...bodies]).toEqual(['{"error":"invalid_credentials"}']);
  });
});
