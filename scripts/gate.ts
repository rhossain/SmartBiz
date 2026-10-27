/**
 * scripts/gate.ts — `bun run gate [--large]`: the full local gate run, the merge evidence
 * (team.md Way of Working; cicd-pipeline.md "Gates"; infrastructure-specification.md
 * "Environments").
 *
 * Runs every gate in order and stops at the first failure; nothing is weakened to pass:
 *   0  preflight: Docker is up, ≥ 2 GiB free, `CI` removed from every child, a throwaway
 *      `postgres:18.6` container (pinned digest, already local — never pulled) with random
 *      passwords and `db/init` mounted read-only, on a free loopback port chosen up front
 *      and published as `127.0.0.1:<port>` (a fixed port, so the outage test's
 *      `docker stop`/`start` keeps it); the realdb URLs are set or the run fails here;
 *   1  install (frozen lockfile)  2 lint  3 type-check  4 format
 *   5  unit + integration        6 coverage floor (every src file)
 *   7  named invariant tests     8 build      9 bundle    10 mutants
 *   11 dependency audit (High/Critical)       12 secret scan
 *   13 realdb on a fresh `gate_realdb` database migrated twice (the second run applies 0)
 *   14 wiring check (its own fresh, empty database)
 *   15 benchmark (`base`; `--large` adds the 10 000-order profile) and 15b the round-trip
 *   16 artifact: `dist/` copied to `.ci-artifacts/smartbiz-dist-<sha>/` (5 newest kept)
 *   17 clean-up: the container is always removed (finally, SIGINT, SIGTERM).
 * U2 (u2-app-shell; cicd-pipeline.md, review I-01, I-05; P12, O12, O14, S17):
 *   5b the three role walks on their own, timed: any test failure fails the gate at once and
 *      is never rerun; only a wall time over 60 s earns ONE rerun, and the gate fails if the
 *      rerun is over 60 s too; the result line carries the checks and both times (NFR6.16);
 *      it also fails when any of the three walks printed no count or 0 checks (G-04), and it
 *      reports the role walks' checks apart from the no-secret walk's scans (G-07);
 *   11 also runs scripts/check-dependencies.ts (package.json equals the committed list);
 *   14b the real-browser check through its OWN exit-code branch, not `step()`: 0 → `browser:
 *      ok (<median> ms, <n> screens)`; 2 → `browser: not run (no Chrome)`, which `--large`
 *      (the Bolt merge run) treats as a failure; anything else fails the gate (I-01);
 *   SIGINT/SIGTERM are forwarded to the running child before the container is removed, so
 *   the browser check can stop Chrome and drop its database (I-02).
 * The last line is the one-line result for the squash commit body. A dirty working tree is
 * reported in that line (the gate should run on a clean checkout of the branch tip).
 */
import { cpSync, existsSync, readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";
import {
  browserFact,
  WALK_BUDGET_MS,
  WALK_FILES,
  walkCounts,
  walkFact,
  walkProblem,
} from "./lib/gate-facts.js";
import { childEnv, forwardSignal, gitDirty, gitHead, run, say } from "./lib/run.js";

const ROOT = join(import.meta.dir, "..");
export const IMAGE =
  "postgres:18.6@sha256:4ef4dbc939d61acea57712655ddb4b4ab27419c913f94cca0cd57cb3ea3c2280";
const MIN_FREE_BYTES = 2 * 1024 ** 3;
const large = process.argv.includes("--large");

const randomSecret = (): string =>
  [...crypto.getRandomValues(new Uint8Array(12))]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

const freePort = (): number => {
  const probe = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch: () => new Response() });
  const port = probe.port ?? 0;
  void probe.stop(true);
  return port;
};

class GateFailed extends Error {}

let container: string | null = null;
const removeContainer = async (): Promise<void> => {
  if (container === null) return;
  const name = container;
  container = null;
  await run(["docker", "rm", "-f", "-v", name], { capture: true });
};
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    // I-02: the running child (e.g. the browser check) cleans up its own resources first.
    forwardSignal(signal);
    void Bun.sleep(4_000)
      .then(removeContainer)
      .then(() => process.exit(130));
  });
}

const main = async (): Promise<void> => {
  const started = performance.now();
  const facts: string[] = [];
  const env = childEnv();
  const step = async (
    n: string,
    label: string,
    cmd: ReadonlyArray<string>,
    extra: Record<string, string> = {},
  ) => {
    say(`\n== ${n} ${label}: ${cmd.join(" ")}`);
    const r = await run(cmd, { cwd: ROOT, env: { ...env, ...extra }, tee: true });
    if (r.code !== 0) throw new GateFailed(`gate ${n} (${label}) failed`);
    return r.out;
  };
  const passCount = (out: string): string => /(\d+) pass/.exec(out)?.[1] ?? "?";

  // 0. preflight
  say("== 0 preflight");
  if (
    (await run(["docker", "info", "--format", "{{.ServerVersion}}"], { capture: true })).code !== 0
  ) {
    throw new GateFailed("gate 0: Docker is not running");
  }
  const df = (await run(["df", "-k", ROOT], { capture: true })).out.trim().split("\n").pop() ?? "";
  const freeBytes = Number(df.split(/\s+/)[3] ?? "0") * 1024;
  if (!(freeBytes >= MIN_FREE_BYTES))
    throw new GateFailed(`gate 0: only ${(freeBytes / 1024 ** 3).toFixed(1)} GiB free (need 2)`);
  const image = await run(["docker", "image", "inspect", IMAGE], { capture: true });
  if (image.code !== 0)
    throw new GateFailed(
      "gate 0: the pinned postgres image is not on this machine (it is never pulled)",
    );
  const adminPw = randomSecret();
  const appPw = randomSecret();
  const port = freePort();
  const name = `smartbiz-gate-${randomSecret().slice(0, 8)}`;
  const created = await run(
    [
      "docker",
      "run",
      "-d",
      "--name",
      name,
      "-p",
      `127.0.0.1:${port}:5432`,
      "-v",
      `${join(ROOT, "db", "init")}:/docker-entrypoint-initdb.d:ro`,
      "-e",
      `POSTGRES_PASSWORD=${adminPw}`,
      "-e",
      `SMARTBIZ_APP_PASSWORD=${appPw}`,
      IMAGE,
    ],
    { capture: true },
  );
  if (created.code !== 0) throw new GateFailed("gate 0: could not start the gate container");
  container = name;
  const adminUrl = `postgres://postgres:${adminPw}@127.0.0.1:${port}/smartbiz`;
  const appBase = `postgres://smartbiz_app:${appPw}@127.0.0.1:${port}/smartbiz`;
  // Ready means the app login can connect over TCP (the init script has run).
  const deadline = performance.now() + 60_000;
  let ready = false;
  while (!ready && performance.now() < deadline) {
    const probe = postgres(appBase, { max: 1, connect_timeout: 2, onnotice: () => undefined });
    ready = await probe`SELECT 1`.then(
      () => true,
      () => false,
    );
    await probe.end({ timeout: 1 });
    if (!ready) await Bun.sleep(500);
  }
  if (!ready) throw new GateFailed("gate 0: the gate database did not become ready");
  const admin = postgres(adminUrl, { max: 1, onnotice: () => undefined });
  await admin.unsafe("CREATE DATABASE gate_realdb");
  await admin.end({ timeout: 5 });
  const realdb = {
    REALDB_ADMIN_URL: adminUrl.replace(/\/smartbiz$/, "/gate_realdb"),
    REALDB_APP_URL: appBase.replace(/\/smartbiz$/, "/gate_realdb"),
    REALDB_CONTAINER: name,
  };
  say(`gate container ${name} on 127.0.0.1:${port}`);

  await step("1", "install", ["bun", "install", "--frozen-lockfile"]);
  await step("2", "lint", ["bun", "run", "lint"]);
  await step("3", "type-check", ["bun", "run", "type-check"]);
  await step("4", "format", ["bun", "run", "format"]);
  facts.push(
    `${passCount(await step("5", "unit + integration", ["bun", "run", "test"]))} tests pass`,
  );
  // 5b. the walks, timed (I-05): a failure fails now; only an overrun is run once more.
  const walkCmd = ["bun", "test", "--timeout", "60000", ...WALK_FILES];
  const timedWalks = async (pass: string) => {
    const t0 = performance.now();
    const out = await step("5b", `walks (${pass})`, walkCmd);
    const counts = walkCounts(out);
    // G-04: green tests are not enough; each of the three walks must have checked something.
    const problem = walkProblem(counts);
    if (problem !== null) throw new GateFailed(`gate 5b: ${problem}`);
    return { ms: Math.round(performance.now() - t0), counts };
  };
  const firstWalk = await timedWalks("first");
  let rerunMs: number | null = null;
  if (firstWalk.ms > WALK_BUDGET_MS) {
    const rerun = await timedWalks("rerun after overrun");
    rerunMs = rerun.ms;
    if (rerun.ms > WALK_BUDGET_MS) {
      throw new GateFailed(
        `gate 5b: walks took ${firstWalk.ms} ms then ${rerun.ms} ms (budget ${WALK_BUDGET_MS} ms)`,
      );
    }
  }
  // G-07: the role walks' checks and the no-secret walk's scans, reported separately.
  facts.push(walkFact(firstWalk.counts, firstWalk.ms, rerunMs));
  const cov = await step("6", "coverage", ["bun", "scripts/check-coverage.ts"]);
  facts.push(`lines ${/coverage ok: ([\d.]+) %/.exec(cov)?.[1] ?? "?"} %`);
  await step("7", "named invariants", [
    "bun",
    "test",
    "tests/unit/audit-immutability-migration.test.ts",
    "tests/unit/three-layer-gate-absence.test.ts",
    "tests/integration/server-gate-absence.test.ts",
  ]);
  await step("8", "build", ["bun", "scripts/build.ts"]);
  const bundle = await step("9", "bundle", ["bun", "scripts/check-bundle.ts"]);
  facts.push(`bundle ${/bundle ok: ([\d.]+) KB/.exec(bundle)?.[1] ?? "?"} KB gz`);
  const mutants = await step("10", "mutants", ["bun", "scripts/mutants.ts"]);
  facts.push(`mutants ${/mutants ok: (\d+\/\d+)/.exec(mutants)?.[1] ?? "?"}`);
  await step("11", "dependency audit", ["bun", "audit", "--audit-level=high"]);
  await step("11", "dependency list", ["bun", "scripts/check-dependencies.ts"]);
  facts.push("bun audit clean, dependencies unchanged");
  await step("12", "secret scan", ["bun", "scripts/secret-scan.ts"]);
  facts.push("secrets clean");
  for (const pass of ["first", "second"]) {
    const out = await step("13", `migrate gate_realdb (${pass})`, ["bun", "src/db/migrate.ts"], {
      MIGRATE_DATABASE_URL: realdb.REALDB_ADMIN_URL,
    });
    if (pass === "second" && !/\(0 applied,/.test(out))
      throw new GateFailed("gate 13: the second migrate applied files");
  }
  facts.push(
    `tests/realdb ${passCount(await step("13", "realdb", ["bun", "test", "tests/realdb"], realdb))} pass`,
  );
  await step("14", "wiring check", ["bun", "tests/e2e/wiring-check.ts"], realdb);
  facts.push("wiring-check ok");
  // 14b. the real browser, through its own exit-code branch (I-01; not `step()`).
  say("\n== 14b browser: bun scripts/browser-check.ts");
  const browser = await run(["bun", "scripts/browser-check.ts"], {
    cwd: ROOT,
    env: { ...env, ...realdb },
    tee: true,
  });
  const browserLine = browserFact(browser.code, browser.out, large);
  if (browserLine === null) {
    throw new GateFailed(
      browser.code === 2
        ? "gate 14b: no Chrome, and --large (a Bolt merge) needs browser: ok"
        : `gate 14b (browser) failed with exit ${browser.code}`,
    );
  }
  facts.push(browserLine);
  await step("15", "benchmark (base)", ["bun", "tests/perf/order-api.bench.ts"], realdb);
  if (large)
    await step(
      "15",
      "benchmark (large)",
      ["bun", "tests/perf/order-api.bench.ts", "--profile=large"],
      realdb,
    );
  facts.push(`bench ${large ? "base+large" : "base"} ok`);
  await step("15b", "round-trip", ["bun", "test", "tests/unit/money-engine-round-trip.test.ts"]);

  // 16. artifact
  const sha = await gitHead();
  const artifacts = join(ROOT, ".ci-artifacts");
  cpSync(join(ROOT, "dist"), join(artifacts, `smartbiz-dist-${sha}`), { recursive: true });
  const kept = readdirSync(artifacts)
    .filter((d) => d.startsWith("smartbiz-dist-"))
    .sort((a, b) => statSync(join(artifacts, b)).mtimeMs - statSync(join(artifacts, a)).mtimeMs);
  for (const old of kept.slice(5)) rmSync(join(artifacts, old), { recursive: true, force: true });
  if (!existsSync(join(artifacts, `smartbiz-dist-${sha}`, "BUILD_SHA")))
    throw new GateFailed("gate 16: artifact copy failed");

  const dirty = (await gitDirty()) ? " (working tree dirty)" : "";
  const minutes = ((performance.now() - started) / 60_000).toFixed(1);
  say(`\ngate ok ${sha.slice(0, 12)}${dirty}: ${facts.join(", ")} (${minutes} min)`);
};

if (import.meta.main) {
  try {
    await main();
  } catch (e: unknown) {
    process.stderr.write(`\ngate FAILED: ${e instanceof Error ? e.message : String(e)}\n`);
    process.exitCode = 1;
  } finally {
    await removeContainer();
  }
}
