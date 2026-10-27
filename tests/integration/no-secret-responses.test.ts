/**
 * tests/integration/no-secret-responses.test.ts — no secret in any response body (NFR3.6;
 * team.md Testing Posture; P-16).
 *
 * Every U1 route is called on a success path and on an error path, and every body is
 * serialised and searched for `passwordHash`, `password_hash`, `token_hash`, an argon2 hash,
 * and the live session cookie value (which may appear only in Set-Cookie). The test also
 * fails when a registered route was not exercised, so a new route must be added here.
 */
import { describe, expect, test } from "bun:test";
import { routeKey, routes } from "../../src/server/routes.js";
import { makeSqlStub } from "../helpers/sql-stub.js";
import { harness, request } from "../helpers/server-harness.js";

const FORBIDDEN = [/passwordHash/i, /password_hash/i, /token_hash/i, /\$argon2/];

const order = {
  source: "manual",
  customerId: null,
  contact: { name: "রিনা", phone: "01711111111", address: null },
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

describe("no secret in any response body", () => {
  test("success and error bodies of every U1 route hold no hash and no live cookie value", async () => {
    const stub = makeSqlStub();
    const h = harness(stub);
    const bodies: Array<{ key: string; text: string }> = [];
    const covered = new Set<string>();
    const call = async (method: string, path: string, key: string, opts = {}) => {
      const r = await h.send(request(method, path, opts));
      covered.add(key);
      const text = await r.text();
      bodies.push({ key, text });
      return { r, text };
    };

    // Public routes, before and after the business exists.
    await call("GET", "/api/health", "GET /api/health");
    await call("GET", "/api/setup", "GET /api/setup");
    const up = await call("POST", "/api/auth/sign-up", "POST /api/auth/sign-up", {
      body: { businessName: "Acme", email: "owner@acme.test", password: "correct-horse-1" },
    });
    const liveTokens = [
      (up.r.headers.get("Set-Cookie") ?? "").replace(/^__Host-sb_session=([^;]*).*$/, "$1"),
    ];
    await call("POST", "/api/auth/sign-up", "POST /api/auth/sign-up", {
      body: { businessName: "B", email: "second@acme.test", password: "correct-horse-1" },
    });
    await call("POST", "/api/auth/sign-in", "POST /api/auth/sign-in", {
      body: { email: "owner@acme.test", password: "wrong-wrong-1" },
    });
    const inn = await call("POST", "/api/auth/sign-in", "POST /api/auth/sign-in", {
      body: { email: "owner@acme.test", password: "correct-horse-1" },
    });
    const token = (inn.r.headers.get("Set-Cookie") ?? "").replace(
      /^__Host-sb_session=([^;]*).*$/,
      "$1",
    );
    liveTokens.push(token);

    // Session and orders as the Owner, each with a refusal beside the success.
    await call("GET", "/api/session", "GET /api/session", { token });
    await call("GET", "/api/session", "GET /api/session");
    const created = await call("POST", "/api/orders", "POST /api/orders", { token, body: order });
    await call("POST", "/api/orders", "POST /api/orders", { token, body: { ...order, items: [] } });
    const id = (JSON.parse(created.text) as { id: string }).id;
    await call("GET", "/api/orders", "GET /api/orders", { token });
    await call("GET", "/api/orders?limit=0", "GET /api/orders", { token });
    await call("GET", `/api/orders/${id}`, "GET /api/orders/:id", { token });
    await call("GET", "/api/orders/not-a-uuid", "GET /api/orders/:id", { token });
    await call("PATCH", `/api/orders/${id}`, "PATCH /api/orders/:id", {
      token,
      body: { deliveryChargePaise: 500 },
    });
    await call("PATCH", `/api/orders/${id}`, "PATCH /api/orders/:id", { token, body: {} });
    await call("POST", `/api/orders/${id}/status`, "POST /api/orders/:id/status", {
      token,
      body: { to: "delivered" },
    });
    for (const to of ["confirmed", "packed"]) {
      await call("POST", `/api/orders/${id}/status`, "POST /api/orders/:id/status", {
        token,
        body: { to },
      });
    }
    await call("POST", `/api/orders/${id}/consignment`, "POST /api/orders/:id/consignment", {
      token,
      body: { consignmentRef: "PT-1234" },
    });
    await call("POST", `/api/orders/${id}/consignment`, "POST /api/orders/:id/consignment", {
      token,
      body: { consignmentRef: "PT-5678" },
    });
    await call("POST", "/api/auth/sign-out", "POST /api/auth/sign-out", { token });
    await call("POST", "/api/auth/sign-out", "POST /api/auth/sign-out");

    expect([...covered].sort()).toEqual(routes.map(routeKey).sort());
    for (const { key, text } of bodies) {
      for (const pattern of FORBIDDEN) {
        expect({ key, pattern: String(pattern), found: pattern.test(text) }).toEqual({
          key,
          pattern: String(pattern),
          found: false,
        });
      }
      for (const live of liveTokens) {
        expect({ key, leaksCookie: live.length > 0 && text.includes(live) }).toEqual({
          key,
          leaksCookie: false,
        });
      }
    }
  });
});
