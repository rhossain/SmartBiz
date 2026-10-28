/**
 * tests/unit/declared-grants.test.ts — the declared grant set matches contract C9 (BR9.1,
 * NFR2.2, amendment A3).
 *
 * C9 is restated inline below and compared with src/db/declared-grants.ts, so changing the
 * declared set without changing the contract fails here; the realdb gate then compares the
 * declared set with what Postgres actually reports. A table created by a migration but
 * missing from the declared set also fails, so a new table cannot ship ungranted or
 * undeclared (team.md Way of Working (f)).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import { DECLARED_GRANTS, declaredGrantMap } from "../../src/db/declared-grants.js";
import { listMigrations, MIGRATIONS_DIR } from "../../src/db/migrate.js";

const C9: Readonly<Record<string, ReadonlyArray<string>>> = {
  users: ["SELECT", "INSERT", "UPDATE"],
  businesses: ["SELECT", "INSERT", "UPDATE"],
  sessions: ["SELECT", "INSERT", "UPDATE", "DELETE"],
  invitations: ["SELECT", "INSERT", "UPDATE"],
  password_resets: ["SELECT", "INSERT", "UPDATE"],
  audit_log: ["SELECT", "INSERT"],
  orders: ["SELECT", "INSERT", "UPDATE"],
  order_items: ["SELECT", "INSERT"],
  consignment_link: ["SELECT", "INSERT"],
  orders_order_no_seq: ["USAGE", "SELECT"],
};

describe("declared grants (C9)", () => {
  test("the declared set equals C9 exactly, relation by relation", () => {
    const declared = declaredGrantMap();
    expect([...declared.keys()].sort()).toEqual(Object.keys(C9).sort());
    for (const [relation, privileges] of Object.entries(C9)) {
      expect({ relation, privileges: declared.get(relation) }).toEqual({
        relation,
        privileges: [...privileges].sort(),
      });
    }
  });

  test("DELETE is declared on sessions and nowhere else", () => {
    const withDelete = DECLARED_GRANTS.filter((g) =>
      (g.privileges as ReadonlyArray<string>).includes("DELETE"),
    ).map((g) => g.relation);
    expect(withDelete).toEqual(["sessions"]);
  });

  test("audit_log is INSERT and SELECT only; order_items is SELECT and INSERT only", () => {
    const m = declaredGrantMap();
    expect(m.get("audit_log")).toEqual(["INSERT", "SELECT"]);
    expect(m.get("order_items")).toEqual(["INSERT", "SELECT"]);
    expect(m.get("consignment_link")).toEqual(["INSERT", "SELECT"]);
  });

  test("each relation is declared once", () => {
    const names = DECLARED_GRANTS.map((g) => g.relation);
    expect(new Set(names).size).toBe(names.length);
  });

  test("every table a migration creates is declared", () => {
    const created = new Set<string>();
    for (const f of listMigrations()) {
      const body = readFileSync(join(MIGRATIONS_DIR, f), "utf8");
      for (const m of body.matchAll(/CREATE TABLE IF NOT EXISTS (\w+)/gi)) created.add(m[1] ?? "");
    }
    const declaredTables = DECLARED_GRANTS.filter((g) => g.kind === "table").map((g) => g.relation);
    expect([...created].sort()).toEqual([...declaredTables].sort());
  });

  test("sequences are declared with sequence privileges only", () => {
    for (const g of DECLARED_GRANTS.filter((x) => x.kind === "sequence")) {
      for (const p of g.privileges) expect(["USAGE", "SELECT", "UPDATE"]).toContain(p);
    }
  });
});
