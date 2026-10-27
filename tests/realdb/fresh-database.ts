/**
 * tests/realdb/fresh-database.ts — one throwaway database per realdb test file.
 *
 * The realdb suite runs against the throwaway `postgres:18` container that scripts/gate.ts
 * starts (or one started by hand), reached through two URLs:
 *   REALDB_ADMIN_URL — the admin login (`postgres`): creates and drops databases, seeds rows
 *                      the app may not write, and runs the migrations (NFR2.3);
 *   REALDB_APP_URL   — `smartbiz_app`, a login member of `app_role` (never a superuser):
 *                      every call under test runs as the application would (team.md).
 * Each file gets a fresh database on that server, named after the file, so files cannot see
 * each other's rows and the singleton business index applies per file. The database is
 * dropped (WITH FORCE) when the file is done. Without both URLs the suite is skipped; the
 * gate runner fails first in that case, so a skip can never pass for a green run.
 */
import postgres from "postgres";
import { runMigrations } from "../../src/db/migrate.js";

export const ADMIN_URL = process.env["REALDB_ADMIN_URL"];
export const APP_URL = process.env["REALDB_APP_URL"];
export const realdbEnabled = ADMIN_URL !== undefined && APP_URL !== undefined;

const quiet = { onnotice: () => undefined, prepare: false } as const;

/** The same server and login, another database. */
export const withDatabase = (url: string, database: string): string => {
  const u = new URL(url);
  u.pathname = `/${database}`;
  return u.toString();
};

export interface FreshDatabase {
  readonly name: string;
  readonly adminUrl: string;
  readonly appUrl: string;
  readonly admin: postgres.Sql;
  readonly app: postgres.Sql;
  readonly drop: () => Promise<void>;
}

const required = (value: string | undefined, name: string): string => {
  if (value === undefined) throw new Error(`${name} is not set`);
  return value;
};

/**
 * Create `rt_<label>_<random>` and, unless `migrate` is false, apply every migration to it
 * with the admin URL.
 */
export const freshDatabase = async (label: string, migrate = true): Promise<FreshDatabase> => {
  const adminBase = required(ADMIN_URL, "REALDB_ADMIN_URL");
  const appBase = required(APP_URL, "REALDB_APP_URL");
  const name = `rt_${label}_${globalThis.crypto.randomUUID().slice(0, 8)}`.replace(/-/g, "_");
  const server = postgres(adminBase, { ...quiet, max: 1 });
  try {
    await server.unsafe(`CREATE DATABASE "${name}"`);
  } finally {
    await server.end({ timeout: 5 });
  }
  const adminUrl = withDatabase(adminBase, name);
  const appUrl = withDatabase(appBase, name);
  if (migrate) await runMigrations(adminUrl);
  const admin = postgres(adminUrl, { ...quiet, max: 2 });
  const app = postgres(appUrl, { ...quiet, max: 3 });
  const drop = async (): Promise<void> => {
    await app.end({ timeout: 5 });
    await admin.end({ timeout: 5 });
    const s = postgres(adminBase, { ...quiet, max: 1 });
    try {
      await s.unsafe(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
    } finally {
      await s.end({ timeout: 5 });
    }
  };
  return { name, adminUrl, appUrl, admin, app, drop };
};

/** The SQLSTATE a statement fails with, or "allowed" when it succeeds. */
export const sqlState = async (run: () => Promise<unknown>): Promise<string> => {
  try {
    await run();
    return "allowed";
  } catch (e) {
    return (e as { code?: string }).code ?? "unknown";
  }
};
