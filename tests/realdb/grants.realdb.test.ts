/**
 * tests/realdb/grants.realdb.test.ts — app_role holds exactly the declared privileges
 * (BR9.1, NFR2.1–NFR2.3, AC1.1.6, AC5.2a.3; team.md Deployment).
 *
 * Postgres's own catalogue is read (`aclexplode(pg_class.relacl)` for every table and
 * sequence in the schema) and compared with src/db/declared-grants.ts as sets per relation:
 * an extra privilege, a missing one, or a granted relation that is not declared fails. The
 * login the server uses is checked to be a non-superuser member of app_role, and the three
 * refusals that matter most are exercised as that login: no UPDATE or DELETE on audit_log,
 * no DELETE on order_items.
 */
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { APP_ROLE, declaredGrantMap } from "../../src/db/declared-grants.js";
import { freshDatabase, realdbEnabled, sqlState, type FreshDatabase } from "./fresh-database.js";

describe.skipIf(!realdbEnabled)("app_role grants on real Postgres", () => {
  let db: FreshDatabase;

  beforeAll(async () => {
    db = await freshDatabase("grants");
  });

  afterAll(async () => {
    await db.drop();
  });

  test("the privileges Postgres reports equal the declared set exactly", async () => {
    const rows = await db.admin<{ relation: string; privilege: string }[]>`
      SELECT c.relname AS relation, a.privilege_type AS privilege
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      CROSS JOIN LATERAL aclexplode(c.relacl) a
      WHERE n.nspname = 'public'
        AND c.relkind IN ('r', 'S', 'v', 'm', 'p')
        AND a.grantee = (SELECT oid FROM pg_roles WHERE rolname = ${APP_ROLE})
    `;
    const actual = new Map<string, string[]>();
    for (const r of rows) actual.set(r.relation, [...(actual.get(r.relation) ?? []), r.privilege]);
    const sorted = new Map([...actual].map(([k, v]) => [k, [...v].sort()]));
    const declared = declaredGrantMap();
    expect([...sorted.keys()].sort()).toEqual([...declared.keys()].sort());
    for (const [relation, privileges] of declared) {
      expect({ relation, privileges: sorted.get(relation) }).toEqual({
        relation,
        privileges: [...privileges],
      });
    }
  });

  test("the server's login is a member of app_role and not a superuser (NFR2.1)", async () => {
    const [me] = await db.app<{ super: boolean; member: boolean }[]>`
      SELECT r.rolsuper AS super,
             COALESCE(pg_has_role(current_user, (SELECT oid FROM pg_roles WHERE rolname = ${APP_ROLE}), 'MEMBER'), false) AS member
      FROM pg_roles r WHERE r.rolname = current_user
    `;
    expect(me).toEqual({ super: false, member: true });
  });

  test("as the app login: audit_log refuses UPDATE and DELETE, order_items refuses DELETE", async () => {
    expect(await sqlState(() => db.app`UPDATE audit_log SET action = 'x'`)).toBe("42501");
    expect(await sqlState(() => db.app`DELETE FROM audit_log`)).toBe("42501");
    expect(await sqlState(() => db.app`TRUNCATE audit_log`)).toBe("42501");
    expect(await sqlState(() => db.app`DELETE FROM order_items`)).toBe("42501");
    expect(await sqlState(() => db.app`DELETE FROM orders`)).toBe("42501");
  });

  test("as the app login: DELETE on sessions is allowed (sign-out)", async () => {
    expect(await sqlState(() => db.app`DELETE FROM sessions WHERE token_hash = 'none'`)).toBe(
      "allowed",
    );
  });
});
