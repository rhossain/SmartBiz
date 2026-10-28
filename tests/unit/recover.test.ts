/**
 * tests/unit/recover.test.ts — browser recovery does nothing, identically for every email
 * (U3 W6; BR5.1; S21 as revised by D-01; NFR3.18; review F-07).
 *
 * Restated: `recover` takes the parsed body only — no `sql`, no hash gate — and answers the
 * same 202 outcome for a known and an unknown email; it writes no row of any table. The
 * module imports neither the database client nor the hash gate, so a lookup cannot be added
 * without changing its signature (the HTTP-level spies are in tests/integration/
 * staff-routes.test.ts). The retired B1 exports are gone.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import * as recoverModule from "../../src/auth/recover.js";
import { recover, RECOVER_OUTCOME } from "../../src/auth/recover.js";
import { staffWorld } from "../helpers/staff-fixtures.js";

describe("recover (W6, D-01)", () => {
  test("a known and an unknown email get the identical 202 outcome", () => {
    const known = recover({ email: "owner@acme.test" });
    const unknown = recover({ email: "nobody@acme.test" });
    expect(known).toEqual({ status: 202 });
    expect(JSON.stringify(unknown)).toBe(JSON.stringify(known));
    expect(known).toBe(RECOVER_OUTCOME);
  });

  test("it takes one argument — the body — and no sql or gate (S21)", () => {
    expect(recover.length).toBe(1);
    const source = readFileSync(join(import.meta.dir, "../../src/auth/recover.ts"), "utf8");
    const imports = source.split("\n").filter((l) => /^import /.test(l));
    expect(imports).toEqual([]);
  });

  test("nothing is written to any table for either email (NFR3.18)", async () => {
    const w = await staffWorld();
    const before = JSON.stringify(w.stub.state);
    const calls = w.stub.calls.length;
    recover({ email: "owner@acme.test" });
    recover({ email: "nobody@acme.test" });
    expect(w.stub.calls.length).toBe(calls);
    expect(JSON.stringify(w.stub.state)).toBe(before);
  });

  test("the retired B1 recovery exports are gone (F-07)", () => {
    expect(Object.keys(recoverModule).sort()).toEqual(["RECOVER_OUTCOME", "recover"]);
  });
});
