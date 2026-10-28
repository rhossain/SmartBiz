/**
 * scripts/start.ts — `bun run start`: build if needed, migrate, serve (U1; W1; BR1.2, BR1.3;
 * infrastructure-specification.md "Configuration"; cicd-pipeline.md "Deployment strategy").
 *
 * 1. Rebuild `dist/` when `dist/BUILD_SHA` is missing, differs from `git rev-parse HEAD`, or
 *    the working tree has uncommitted changes — so a revert or checkout never serves a stale
 *    bundle.
 * 2. Run the migrations with `bun --env-file=.env.migrate src/db/migrate.ts`: only this
 *    child sees the admin URL (`MIGRATE_DATABASE_URL`); this process never loads it.
 * 3. Start the server (`src/server/main.ts`, which bun gives `.env`), copying every log line
 *    to the terminal and appending it to `logs/smartbiz-<YYYY-MM-DD>.log` for
 *    `bun run logs:summary`. Ctrl-C / SIGTERM is passed on, so the server shuts down
 *    gracefully (≤ 5 s) and this script exits with its code.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { childEnv, eachChunk, fail, gitDirty, gitHead, run, say } from "./lib/run.js";

const ROOT = join(import.meta.dir, "..");

const needsBuild = async (): Promise<boolean> => {
  const file = join(ROOT, "dist", "BUILD_SHA");
  if (!existsSync(file)) return true;
  if (await gitDirty()) return true;
  return readFileSync(file, "utf8").trim() !== (await gitHead());
};

const main = async (): Promise<void> => {
  if (!existsSync(join(ROOT, ".env.migrate")))
    fail("start: .env.migrate is missing (see .env.migrate.example)");
  if (!existsSync(join(ROOT, ".env"))) fail("start: .env is missing (see .env.example)");
  if (await needsBuild()) {
    say("start: building dist/ (BUILD_SHA missing, stale or tree dirty)");
    if ((await run(["bun", "scripts/build.ts"], { cwd: ROOT })).code !== 0)
      fail("start: build failed");
  }
  // The server must never see the admin URL: drop it from the child env even if exported.
  const env = childEnv();
  delete env["MIGRATE_DATABASE_URL"];
  const migrate = await run(["bun", "--env-file=.env.migrate", "src/db/migrate.ts"], {
    cwd: ROOT,
    env,
  });
  if (migrate.code !== 0) fail("start: migrations failed; the server was not started");

  mkdirSync(join(ROOT, "logs"), { recursive: true });
  const day = new Date().toISOString().slice(0, 10);
  const logFile = join(ROOT, "logs", `smartbiz-${day}.log`);
  const server = Bun.spawn(["bun", "src/server/main.ts"], {
    cwd: ROOT,
    env,
    stdout: "pipe",
    stderr: "inherit",
    stdin: "ignore",
  });
  const forward = (signal: "SIGINT" | "SIGTERM") => () => server.kill(signal);
  process.on("SIGINT", forward("SIGINT"));
  process.on("SIGTERM", forward("SIGTERM"));
  await eachChunk(server.stdout as ReadableStream<Uint8Array>, (text) => {
    process.stdout.write(text);
    appendFileSync(logFile, text);
  });
  process.exit(await server.exited);
};

if (import.meta.main) await main();
