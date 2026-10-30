/**
 * src/server/main.ts — the bun HTTP server's entry point (W1; R2; S9; BR1.1–BR1.3, BR1.6,
 * BR3.7; NFR5.3, NFR6.6, NFR7.3, NFR7.4).
 *
 * Start-up order, each step failing fast with one line and exit code 1:
 *   1. read the configuration (PORT, DATABASE_URL; refuse MIGRATE_DATABASE_URL);
 *   2. check the route table (every route gated or on the public allow-list);
 *   3. connect and run the role check (not a superuser, a member of app_role);
 *   4. listen on 127.0.0.1 only — the hostname is a constant, not configuration — with
 *      bun's own 64 KiB body cap, serving `dist/` and `/api/`.
 * SIGINT/SIGTERM stop accepting connections, wait at most 5 s for requests in flight, close
 * the pool and exit 0. Sessions are only in Postgres, so a restart signs nobody out.
 *
 * `startServer` is exported for the skeleton check and the benchmark; the command-line entry
 * runs only under `import.meta.main`, so importing this module starts nothing (team.md
 * Testing Posture: every `src` file is in the coverage report).
 */
import { join } from "node:path";
import { getDummyHash } from "../auth/argon2.js";
import { createAttemptLimiter, SIGN_IN_LIMIT } from "../auth/attempt-limiter.js";
import { createHashGate } from "../auth/hash-gate.js";
import { now } from "../data/clock.js";
import { checkRole, createPool, type Sql } from "../db/client.js";
import { log } from "../observability/log.js";
import { BIND_HOST, readConfig, type ServerConfig } from "./config.js";
import { handle, MAX_UPLOAD_BYTES } from "./pipeline.js";
import { diskPhotoStore, photoDir } from "./photo-store.js";
import { assertRouteTable, routes } from "./routes.js";
import type { ServerDeps } from "./types.js";

export const DIST_DIR = join(import.meta.dir, "..", "..", "dist");
export const SHUTDOWN_GRACE_MS = 5_000;

export interface RunningServer {
  readonly hostname: string;
  readonly port: number;
  readonly stop: () => Promise<void>;
}

/**
 * The production dependencies of the request pipeline. U3 (P-02): built here, in one place,
 * and never with `hooks` — the race-test pause points exist only in tests.
 */
export const serverDeps = (config: ServerConfig, sql: Sql, distDir: string | null): ServerDeps => ({
  sql,
  port: config.port,
  limiter: createAttemptLimiter(SIGN_IN_LIMIT),
  hashGate: createHashGate(),
  distDir,
  clock: now,
  log,
  // Product photos live on this machine, outside the database (src/server/photo-store.ts).
  photos: diskPhotoStore(photoDir()),
});

/** Steps 2–4 of start-up, for a configuration that has already been read. */
export const startServer = async (
  config: ServerConfig,
  options: { readonly sql?: Sql; readonly distDir?: string | null } = {},
): Promise<RunningServer> => {
  assertRouteTable(routes);
  const sql = options.sql ?? createPool(config.databaseUrl);
  const role = await checkRole(sql);
  if (!role.ok) {
    await sql.end({ timeout: 1 });
    throw new Error(
      role.error.kind === "superuser"
        ? `database user ${role.error.user} is a superuser; connect as a member of app_role`
        : `database user ${role.error.user} is not a member of app_role`,
    );
  }
  // Computed once, in the background, so the first unknown-email sign-in costs the same.
  void getDummyHash();
  const deps = serverDeps(config, sql, options.distDir === undefined ? DIST_DIR : options.distDir);
  const server = Bun.serve({
    hostname: BIND_HOST,
    port: config.port,
    maxRequestBodySize: MAX_UPLOAD_BYTES,
    fetch: (request) => handle(request, deps),
  });
  const stop = async (): Promise<void> => {
    const graceful = server.stop(false);
    const timer = new Promise<void>((resolve) => setTimeout(resolve, SHUTDOWN_GRACE_MS));
    await Promise.race([graceful, timer]);
    await server.stop(true);
    await sql.end({ timeout: 5 });
  };
  return { hostname: server.hostname ?? "", port: server.port ?? config.port, stop };
};

const fail = (message: string): never => {
  log({ level: "error", message: "startup_failed", reason: message });
  // eslint-disable-next-line no-console -- server entry: the one-line fail-fast reason (NFR7.4).
  console.error(`smartbiz: ${message}`);
  process.exit(1);
};

const main = async (): Promise<void> => {
  const config = readConfig(process.env);
  if (!config.ok) return fail(config.error);
  let running: RunningServer;
  try {
    running = await startServer(config.value);
  } catch (e: unknown) {
    return fail(e instanceof Error ? e.message : String(e));
  }
  log({ level: "info", message: "server_started", host: BIND_HOST, port: running.port });
  const shutdown = (signal: string): void => {
    log({ level: "info", message: "server_stopping", signal });
    void running.stop().then(() => process.exit(0));
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
};

if (import.meta.main) {
  void main();
}
