/**
 * tests/integration/security-headers.test.ts — the S5 headers on every response (BR1.7,
 * NFR4.1; C1; AC5.2a.4).
 *
 * Restated set: Content-Security-Policy `default-src 'self'; frame-ancestors 'none';
 * base-uri 'none'; form-action 'self'`, X-Content-Type-Options `nosniff`, Referrer-Policy
 * `no-referrer`, X-Frame-Options `DENY` on every response; API responses also carry
 * `Cache-Control: no-store` and a 16-hex `X-Correlation-Id`. Checked on every registered
 * route (success or refusal alike), on refusals before routing, and on static files.
 */
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import { routes } from "../../src/server/routes.js";
import { makeSqlStub } from "../helpers/sql-stub.js";
import { harness, request, seedBusiness } from "../helpers/server-harness.js";

const S5: Readonly<Record<string, string>> = {
  "content-security-policy":
    "default-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "x-frame-options": "DENY",
};

const expectS5 = (label: string, r: Response): void => {
  for (const [name, value] of Object.entries(S5)) {
    expect({ label, name, value: r.headers.get(name) }).toEqual({ label, name, value });
  }
};

const expectApi = (label: string, r: Response): void => {
  expectS5(label, r);
  expect({ label, cache: r.headers.get("cache-control") }).toEqual({ label, cache: "no-store" });
  expect(r.headers.get("x-correlation-id") ?? "").toMatch(/^[0-9a-f]{16}$/);
};

describe("security headers", () => {
  test("every registered route answers with S5, no-store and a correlation id", async () => {
    const stub = makeSqlStub();
    const tokens = await seedBusiness(stub);
    const h = harness(stub);
    for (const route of routes) {
      const path = route.path.replace(":id", "0f0f0f0f-0f0f-4f0f-8f0f-0f0f0f0f0f0f");
      const r = await h.send(request(route.method, path, { token: tokens.owner }));
      expectApi(`${route.method} ${route.path}`, r);
    }
  });

  test("refusals before routing carry them too: Host, Origin, 404, 413", async () => {
    const h = harness();
    expectApi("host", await h.send(request("GET", "/api/health", { host: "localhost:3000" })));
    expectApi("origin", await h.send(request("POST", "/api/auth/sign-out", { origin: null })));
    expectApi("404", await h.send(request("GET", "/api/nope")));
    expectApi(
      "413",
      await h.send(
        request("POST", "/api/auth/sign-in", { headers: { "Content-Length": "99999" } }),
      ),
    );
  });

  test("static files carry S5; hashed assets are immutable and index.html is never cached", async () => {
    const dist = mkdtempSync(join(tmpdir(), "smartbiz-dist-"));
    mkdirSync(join(dist, "assets"));
    writeFileSync(join(dist, "index.html"), "<!doctype html><title>SmartBiz</title>");
    writeFileSync(join(dist, "assets", "index-abc123.js"), "export {};");
    const h = harness(makeSqlStub(), { distDir: dist });
    const page = await h.send(request("GET", "/orders"));
    expectS5("index", page);
    expect(page.headers.get("cache-control")).toBe("no-store");
    const asset = await h.send(request("GET", "/assets/index-abc123.js"));
    expectS5("asset", asset);
    expect(asset.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
    expectS5("missing", await h.send(request("GET", "/missing.js")));
  });
});
