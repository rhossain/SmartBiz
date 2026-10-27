/**
 * src/db/client.ts — the postgres.js connection pool and the start-up role check
 * (PersistenceComponent; P3, R1, S8; BR1.2, NFR2.1, NFR6.8, NFR7.1).
 *
 * Pool: at most 5 connections (the bottleneck by design, scalability S1), `prepare: false`,
 * a 10 s connect timeout, and per-connection `statement_timeout = 5s` and
 * `idle_in_transaction_session_timeout = 10s`, so a slow query or a stuck transaction fails
 * fast instead of holding a connection (an outage answers 503, R1). NOTICEs are dropped:
 * they are informational and would otherwise be printed by the driver.
 *
 * The server connects as a login member of `app_role`, never as a superuser (team.md
 * Deployment). `checkRole` is run once before the server listens; a failure stops start-up.
 * Server-only module: browser files may import its types only (BR7.1).
 */
import postgres from "postgres";
import { err, ok, type Result } from "../data/result.js";
import { APP_ROLE } from "./declared-grants.js";

export type Sql = ReturnType<typeof postgres>;

/**
 * Anything that can run a tagged-template query: the pool itself or the `tx` handle inside
 * `sql.begin(...)`. Functions that must be callable from inside a caller's transaction
 * (insertAudit, the order writes, the session store) take this type, so an entity write and
 * its audit row commit or roll back together (NFR5.7, R3).
 */
export type Queryable = postgres.ISql;

export const POOL_MAX = 5;
export const CONNECT_TIMEOUT_S = 10;
export const STATEMENT_TIMEOUT_MS = 5_000;
export const IDLE_IN_TRANSACTION_TIMEOUT_MS = 10_000;

/** A pool with the U1 limits and timeouts. */
export const createPool = (url: string, max: number = POOL_MAX): Sql =>
  postgres(url, {
    max,
    idle_timeout: 30,
    connect_timeout: CONNECT_TIMEOUT_S,
    prepare: false,
    onnotice: () => undefined,
    connection: {
      statement_timeout: STATEMENT_TIMEOUT_MS,
      idle_in_transaction_session_timeout: IDLE_IN_TRANSACTION_TIMEOUT_MS,
    },
  });

export type RoleCheckError =
  | { readonly kind: "superuser"; readonly user: string }
  | { readonly kind: "not_app_role"; readonly user: string };

/**
 * BR1.2: the connected user must not be a superuser and must be a member of app_role. A
 * superuser is a member of every role, so that condition is checked first. When app_role
 * does not exist at all, `pg_has_role` receives NULL and the user is "not a member".
 */
export const checkRole = async (sql: Queryable): Promise<Result<string, RoleCheckError>> => {
  const rows = await sql<{ user: string; super: boolean; member: boolean }[]>`
    SELECT current_user AS user, r.rolsuper AS super,
           COALESCE(pg_has_role(current_user, (SELECT oid FROM pg_roles WHERE rolname = ${APP_ROLE}), 'MEMBER'), false) AS member
    FROM pg_roles r
    WHERE r.rolname = current_user
  `;
  const row = rows[0];
  if (!row) throw new Error("role check returned no row for current_user");
  if (row.super) return err({ kind: "superuser", user: row.user });
  if (!row.member) return err({ kind: "not_app_role", user: row.user });
  return ok(row.user);
};
