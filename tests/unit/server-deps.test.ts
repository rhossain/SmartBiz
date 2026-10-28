/**
 * tests/unit/server-deps.test.ts — production wiring never carries the race-test hooks (U3
 * review P-02; NFR7.16).
 *
 * The staff write paths take optional pause points (`deps.hooks`) so a realdb test can force
 * a race. They must never exist in production: `startServer` builds its dependencies through
 * `serverDeps`, which has no hooks key at all — not even an undefined one — and the request
 * pipeline only passes hooks on when the deps carry them.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { serverDeps } from "../../src/server/main.js";
import { makeSqlStub } from "../helpers/sql-stub.js";

describe("server deps (P-02)", () => {
  test("serverDeps builds no hooks key", () => {
    const deps = serverDeps(
      { port: 3999, databaseUrl: "postgres://placeholder@127.0.0.1/x" },
      makeSqlStub().sql,
      null,
    );
    expect(Object.hasOwn(deps, "hooks")).toBe(false);
    expect(deps.port).toBe(3999);
    expect(deps.distDir).toBeNull();
  });

  test("startServer builds its deps through serverDeps and names no hooks", () => {
    const source = readFileSync(join(import.meta.dir, "../../src/server/main.ts"), "utf8");
    const start = source.slice(source.indexOf("export const startServer"));
    expect(start).toContain("serverDeps(config, sql,");
    expect(/\bhooks\b/.test(start)).toBe(false);
  });
});
