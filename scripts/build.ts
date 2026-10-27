/**
 * scripts/build.ts — `bun run build`: the Vite build, then `dist/BUILD_SHA` (U1; BR10.x;
 * cicd-pipeline.md "Post-merge smoke").
 *
 * The server serves `dist/BUILD_SHA` at `/build-sha`, and the smoke check compares it with
 * `git rev-parse HEAD`, so a stale bundle after a revert is caught. A build from a working
 * tree with uncommitted source changes is marked `<sha>-dirty`, which never equals HEAD, so
 * `bun run start` rebuilds it next time and the smoke check refuses it.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { fail, gitDirty, gitHead, run, say } from "./lib/run.js";

const ROOT = join(import.meta.dir, "..");

const main = async (): Promise<void> => {
  const vite = await run(["bunx", "vite", "build"], { cwd: ROOT });
  if (vite.code !== 0) fail("build failed: vite build exited non-zero");
  const sha = `${await gitHead()}${(await gitDirty()) ? "-dirty" : ""}`;
  writeFileSync(join(ROOT, "dist", "BUILD_SHA"), `${sha}\n`);
  say(`build ok ${sha}`);
};

if (import.meta.main) await main();
