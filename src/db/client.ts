/**
 * DB client (postgres.js env).
 * Per NFR6.2 / NFR7.7 — bun-postgres pool, max 5, env `DATABASE_URL`.
 * Tests boot a per-test connection via `tests/setup.ts`.
 */
import postgres from "postgres";

export type Sql = ReturnType<typeof postgres>;

/**
 * Anything that can run a tagged-template query: the pool itself or the
 * `tx` handle inside `sql.begin(...)`. Functions that must be callable
 * from inside a caller's transaction (insertAudit, the order writes)
 * take this type, so the audit row and the entity write commit or roll
 * back together (NFR5.7).
 */
export type Queryable = postgres.ISql;

let pool: Sql | null = null;

export const getPool = (): Sql => {
  if (pool) return pool;
  const url = process.env["DATABASE_URL"];
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  pool = postgres(url, {
    max: 5,
    idle_timeout: 30,
    connect_timeout: 10,
    prepare: false,
  });
  return pool;
};

export const closePool = async (): Promise<void> => {
  if (pool) {
    await pool.end({ timeout: 5 });
    pool = null;
  }
};

/** Construct an isolated pool for tests (does not mutate the singleton). */
export const makePool = (url: string): Sql => postgres(url, { max: 2, prepare: false });