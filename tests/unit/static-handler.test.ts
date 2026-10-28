/**
 * tests/unit/static-handler.test.ts — serving `dist/` safely (S6; NFR5.4; T13).
 *
 * A throwaway `dist/` holds index.html, a hashed asset, a source map and a dotfile; a
 * symlink inside it points at a file outside. Restated refusals: encoded slash, backslash
 * or NUL; `..`; any dot segment; source maps; a symlink leading out; any method but GET and
 * HEAD (405). Paths without an extension fall back to index.html (the SPA's own routes).
 */
import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, test } from "bun:test";
import {
  createStaticHandler,
  safeRelativePath,
  type StaticHandler,
} from "../../src/server/static.js";

let serve: StaticHandler;

beforeAll(() => {
  const base = mkdtempSync(join(tmpdir(), "smartbiz-static-"));
  const dist = join(base, "dist");
  mkdirSync(join(dist, "assets"), { recursive: true });
  writeFileSync(join(dist, "index.html"), "<!doctype html><p>app</p>");
  writeFileSync(join(dist, "assets", "app-1a2b.js"), "console.warn('app');");
  writeFileSync(join(dist, "assets", "app-1a2b.js.map"), "{}");
  writeFileSync(join(dist, ".env"), "DATABASE_URL=secret");
  writeFileSync(join(base, "outside.txt"), "outside");
  symlinkSync(join(base, "outside.txt"), join(dist, "linked.txt"));
  serve = createStaticHandler(dist);
});

const get = (path: string, method = "GET") =>
  serve(new Request(`http://127.0.0.1:3000${path}`, { method }), path);

describe("static handler", () => {
  test("an existing file is served with its content type", async () => {
    const r = await get("/assets/app-1a2b.js");
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type") ?? "").toMatch(/javascript/);
    expect(await r.text()).toContain("app");
  });

  test("encoded slash, backslash and NUL are refused in any case", async () => {
    for (const p of [
      "/assets%2fapp-1a2b.js",
      "/assets%2Fapp-1a2b.js",
      "/a%5c..%5c.env",
      "/index.html%00.js",
    ]) {
      expect({ p, status: (await get(p)).status }).toEqual({ p, status: 404 });
    }
  });

  test("`..`, dot segments, dotfiles and source maps are refused", async () => {
    for (const p of [
      "/../outside.txt",
      "/assets/../.env",
      "/.env",
      "/%2e%2e/outside.txt",
      "/assets/app-1a2b.js.map",
    ]) {
      expect({ p, status: (await get(p)).status }).toEqual({ p, status: 404 });
    }
    expect(safeRelativePath("/a/./b")).toBeNull();
  });

  test("a symlink that leads outside dist/ is refused", async () => {
    expect((await get("/linked.txt")).status).toBe(404);
  });

  test("a path without an extension gets index.html; a missing file with one is 404", async () => {
    const spa = await get("/orders/new");
    expect(spa.status).toBe(200);
    expect(await spa.text()).toContain("app");
    expect((await get("/")).status).toBe(200);
    expect((await get("/missing.js")).status).toBe(404);
  });

  test("only GET and HEAD are served; HEAD has no body", async () => {
    expect((await get("/", "POST")).status).toBe(405);
    expect((await get("/", "DELETE")).status).toBe(405);
    const head = await get("/assets/app-1a2b.js", "HEAD");
    expect(head.status).toBe(200);
    expect(await head.text()).toBe("");
  });
});
