/**
 * tests/integration/audit-route.test.ts — `GET /api/audit` through the real request pipeline
 * on the SQL stub (C4; W4; BR7.1–BR7.5; S13, O11; NFR3.13, NFR3.15, NFR4.2; N-01, N-04).
 *
 * Restated:
 *  - Owner, Manager and Accountant read the trail (200, the shared response schema, entries
 *    without payload); Sales Staff get 403 (BR7.5);
 *  - `limit` 0, 51, -1, 1.5 and `abc`, an unknown query key (a `businessId` included: the
 *    business comes from the session only, BR7.1), and a truncated, foreign-shaped or
 *    non-base64url cursor each answer 400 `invalid_input` — never 500 — and the body never
 *    repeats the cursor (NFR3.15); a bad cursor names the `cursor` field;
 *  - the cursor pages over HTTP to the end with `nextCursor: null`;
 *  - the request log line carries the route pattern `/api/audit` only: no log line holds the
 *    cursor, a `?` or an email (O11, NFR3.13, N-04);
 *  - the C1 headers are on the answer (NFR4.2).
 */
import { describe, expect, test } from "bun:test";
import { encodeAuditCursor } from "../../src/audit/audit-read.js";
import { AuditPageResponseSchema } from "../../src/audit/schemas.js";
import { makeSqlStub } from "../helpers/sql-stub.js";
import {
  BUSINESS,
  harness,
  NOW,
  request,
  seedBusiness,
  userIdFor,
} from "../helpers/server-harness.js";

const YEAR = 365 * 24 * 60 * 60 * 1000;

const world = async (rows = 3) => {
  const stub = makeSqlStub();
  const tokens = await seedBusiness(stub);
  for (let n = 1; n <= rows; n++) {
    const at = new Date(NOW.getTime() - n * 60_000).toISOString();
    stub.state.auditLog.push({
      id: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
      business_id: BUSINESS,
      actor_user_id: userIdFor("owner"),
      correlation_id: `corr-${n}`,
      action: "order.create",
      subject_kind: "order",
      subject_id: null,
      payload: JSON.stringify({ contact: "রিনা 01711111111" }),
      reverses_id: null,
      occurred_at: at,
      retention_until: new Date(Date.parse(at) + 5 * YEAR).toISOString(),
    });
  }
  return { h: harness(stub), tokens };
};

describe("GET /api/audit", () => {
  test("Owner, Manager and Accountant read it; Sales Staff get 403 (BR7.5)", async () => {
    const { h, tokens } = await world();
    for (const role of ["owner", "manager", "accountant"] as const) {
      const r = await h.send(request("GET", "/api/audit", { token: tokens[role] }));
      expect({ role, status: r.status }).toEqual({ role, status: 200 });
      const body = AuditPageResponseSchema.parse(await r.json());
      expect(body.entries.map((e) => e.actorEmail)).toEqual([
        "owner@acme.test",
        "owner@acme.test",
        "owner@acme.test",
      ]);
    }
    const staff = await h.send(request("GET", "/api/audit", { token: tokens.sales_staff }));
    expect(staff.status).toBe(403);
    expect(await staff.json()).toEqual({ error: "forbidden" });
  });

  test("no payload and no retention date in the answer (BR7.4)", async () => {
    const { h, tokens } = await world();
    const text = await (await h.send(request("GET", "/api/audit", { token: tokens.owner }))).text();
    expect(text).not.toContain("payload");
    expect(text).not.toContain("retention");
    expect(text).not.toContain("01711111111");
  });

  // U4 (NFR-design review R-05; S27): catalog change-log rows carry cost in their payloads
  // (product.create, product.cost.set); the page read selects no payload, so no audit reader
  // ever receives one through this route.
  test("after catalog writes, no audit body has a payload key or a cost figure (R-05)", async () => {
    const { h, tokens } = await world(0);
    const created = await h.send(
      request("POST", "/api/products", {
        token: tokens.owner,
        body: {
          name: "কুর্তি",
          sku: "AUDIT-COST",
          sellingPricePaise: 120_000,
          purchaseCostPaise: 87_654,
          axes: [],
          variants: [{ axisValues: [], stock: 1, minimumStock: 0 }],
        },
      }),
    );
    expect(created.status).toBe(201);
    const { product } = (await created.json()) as { product: { id: string } };
    await h.send(
      request("PATCH", `/api/products/${product.id}/cost`, {
        token: tokens.owner,
        body: { purchaseCostPaise: 76_543 },
      }),
    );
    for (const role of ["owner", "manager", "accountant"] as const) {
      const r = await h.send(request("GET", "/api/audit", { token: tokens[role] }));
      const body = (await r.json()) as { entries: Array<Record<string, unknown>> };
      // Both rows carry the frozen clock's instant, so their page order is a tie: compare as a set.
      expect(body.entries.map((e) => e["action"]).sort()).toEqual([
        "product.cost.set",
        "product.create",
      ]);
      for (const e of body.entries) expect(Object.hasOwn(e, "payload")).toBe(false);
      const text = JSON.stringify(body);
      expect([text.includes("87654"), text.includes("76543")]).toEqual([false, false]);
    }
  });

  test("a bad limit, an unknown key or a bad cursor is 400 invalid_input, never echoed (NFR3.15)", async () => {
    const { h, tokens } = await world();
    const good = encodeAuditCursor(new Date(NOW.getTime() - 60_000).toISOString(), "x");
    const cases: ReadonlyArray<readonly [string, string]> = [
      ["limit=0", "limit"],
      ["limit=51", "limit"],
      ["limit=-1", "limit"],
      ["limit=1.5", "limit"],
      ["limit=abc", "limit"],
      ["sort=asc", "sort"],
      [`businessId=${BUSINESS}`, "businessId"],
      ["cursor=not%20base64!", "cursor"],
      [`cursor=${good.slice(0, 12)}`, "cursor"],
      [`cursor=${good}`, "cursor"],
      [`cursor=${btoa("2026-10-27T08:00:00.000Z")}`, "cursor"],
      [`cursor=${"A".repeat(201)}`, "cursor"],
    ];
    for (const [query, field] of cases) {
      const r = await h.send(request("GET", `/api/audit?${query}`, { token: tokens.owner }));
      const text = await r.text();
      const body = JSON.parse(text) as { error: string; fields?: Array<{ path: string }> };
      expect({ query, status: r.status, error: body.error }).toEqual({
        query,
        status: 400,
        error: "invalid_input",
      });
      expect({ query, fields: body.fields?.map((f) => f.path) }).toEqual({
        query,
        fields: [field],
      });
      const value = decodeURIComponent(query.split("=")[1] ?? "");
      if (query.startsWith("cursor="))
        expect({ query, echoed: text.includes(value) }).toEqual({ query, echoed: false });
    }
  });

  test("the cursor pages over HTTP to the end; limit defaults to 50", async () => {
    const { h, tokens } = await world(5);
    const ids: string[] = [];
    let cursor: string | null = null;
    for (let i = 0; i < 5; i++) {
      const q: string = cursor === null ? "limit=2" : `limit=2&cursor=${cursor}`;
      const r = await h.send(request("GET", `/api/audit?${q}`, { token: tokens.owner }));
      const body = AuditPageResponseSchema.parse(await r.json());
      ids.push(...body.entries.map((e) => e.id));
      cursor = body.nextCursor;
      if (cursor === null) break;
    }
    expect(ids).toHaveLength(5);
    expect(new Set(ids).size).toBe(5);
    const all = AuditPageResponseSchema.parse(
      await (await h.send(request("GET", "/api/audit", { token: tokens.owner }))).json(),
    );
    expect(all.entries).toHaveLength(5);
    expect(all.nextCursor).toBeNull();
  });

  test("the log holds the route pattern only: no cursor, no ? and no email (O11, N-04)", async () => {
    const { h, tokens } = await world(3);
    const first = AuditPageResponseSchema.parse(
      await (await h.send(request("GET", "/api/audit?limit=1", { token: tokens.owner }))).json(),
    );
    const cursor = first.nextCursor ?? "";
    expect(cursor).not.toBe("");
    await h.send(request("GET", `/api/audit?limit=1&cursor=${cursor}`, { token: tokens.owner }));
    await h.send(request("GET", "/api/audit?cursor=broken!", { token: tokens.owner }));
    const lines = h.logs.map((l) => JSON.stringify(l));
    const requestLines = h.logs.filter((l) => l["message"] === "request");
    expect(requestLines).toHaveLength(3);
    for (const l of requestLines) expect(l["route"]).toBe("/api/audit");
    for (const line of lines) {
      expect({ line, cursor: line.includes(cursor) }).toEqual({ line, cursor: false });
      expect({ line, query: line.includes("?") }).toEqual({ line, query: false });
      expect({ line, email: line.includes("@") }).toEqual({ line, email: false });
    }
  });

  test("the answer carries the C1 headers (NFR4.2)", async () => {
    const { h, tokens } = await world(1);
    const r = await h.send(request("GET", "/api/audit", { token: tokens.accountant }));
    expect(r.headers.get("Content-Security-Policy")).toContain("frame-ancestors 'none'");
    expect(r.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(r.headers.get("Referrer-Policy")).toBe("no-referrer");
    expect(r.headers.get("X-Frame-Options")).toBe("DENY");
    expect(r.headers.get("Cache-Control")).toBe("no-store");
    expect(r.headers.get("X-Correlation-Id")).toMatch(/^[0-9a-f]{16}$/);
  });
});
