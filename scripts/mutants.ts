/**
 * scripts/mutants.ts — `bun run mutants`: every named mutant must be caught (team.md Testing
 * Posture "Scripted, named mutants"; cicd-pipeline.md gate 10).
 *
 * For each entry of `tests/mutants.json` it:
 *   1. creates a throwaway git worktree of HEAD in the system temp folder (one at a time, so
 *      the disk cost is one checkout), with `node_modules` symlinked from this checkout;
 *   2. checks that `find` occurs exactly once in `file` — a mutant that no longer applies is
 *      a failure, never a silent skip — and replaces it with `replace`;
 *   3. runs the mapped test there and expects it to FAIL; a test that still passes means the
 *      invariant is unguarded;
 *   4. removes the worktree, also when a step fails.
 * First a control run executes every mapped test in an unmutated worktree and requires it to
 * pass, so a "kill" can never come from a broken checkout. The run fails if any mutant
 * survives or cannot be applied. `--only <id>` runs one entry.
 * It mutates committed code only (HEAD), so commit before running it.
 * U3: an entry whose `test` names a tests/realdb file also receives the realdb URLs (the gate
 * passes them to this step), so a row-lock mutant is checked on a real Postgres too.
 */
import { mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { childEnv, fail, run, say } from "./lib/run.js";

const ROOT = join(import.meta.dir, "..");

export interface Mutant {
  readonly id: string;
  readonly why: string;
  readonly file: string;
  readonly find: string;
  readonly replace: string;
  readonly test: string;
}

export const applyMutant = (text: string, m: Mutant): string => {
  const count = text.split(m.find).length - 1;
  if (count !== 1) throw new Error(`mutant ${m.id}: "find" occurs ${count} times in ${m.file}`);
  return text.replace(m.find, m.replace);
};

type Outcome = "killed" | "survived" | "broken";

/** A null mutant: the mapped tests must pass in an unmutated worktree, or a "kill" proves nothing. */
const CONTROL = (tests: ReadonlyArray<string>): Mutant => ({
  id: "control",
  why: "unmutated baseline",
  file: "package.json",
  find: '"name": "smartbiz-bd"',
  replace: '"name": "smartbiz-bd"',
  test: [...new Set(tests)].join(" "),
});

const tryMutant = async (m: Mutant): Promise<Outcome> => {
  const base = mkdtempSync(join(tmpdir(), "smartbiz-mutant-"));
  const tree = join(base, "tree");
  const added = await run(["git", "worktree", "add", "--detach", tree, "HEAD"], {
    cwd: ROOT,
    capture: true,
  });
  if (added.code !== 0) {
    rmSync(base, { recursive: true, force: true });
    say(`  ${m.id}: could not create a worktree`);
    return "broken";
  }
  try {
    symlinkSync(join(ROOT, "node_modules"), join(tree, "node_modules"));
    const path = join(tree, m.file);
    try {
      writeFileSync(path, applyMutant(readFileSync(path, "utf8"), m));
    } catch (e: unknown) {
      say(`  ${m.id}: ${e instanceof Error ? e.message : String(e)}`);
      return "broken";
    }
    // The mutant must make the mapped test fail. Realdb URLs are passed on only to a mutant
    // whose mapped tests include a tests/realdb file (U3: the row-lock mutants, whose real
    // effect only a real database shows); the gate sets them, and without them that file
    // skips and the mapped unit test alone decides.
    const env = childEnv();
    // Never the container name: no mutant run may stop the gate's database (outage test).
    delete env["REALDB_CONTAINER"];
    if (!m.test.includes("tests/realdb/")) {
      delete env["REALDB_ADMIN_URL"];
      delete env["REALDB_APP_URL"];
    }
    const tested = await run(["bun", "test", ...m.test.split(" ")], {
      cwd: tree,
      env,
      capture: true,
    });
    return tested.code === 0 ? "survived" : "killed";
  } finally {
    await run(["git", "worktree", "remove", "--force", tree], { cwd: ROOT, capture: true });
    rmSync(base, { recursive: true, force: true });
  }
};

const main = async (): Promise<void> => {
  const all = (
    JSON.parse(readFileSync(join(ROOT, "tests", "mutants.json"), "utf8")) as {
      mutants: ReadonlyArray<Mutant>;
    }
  ).mutants;
  const onlyAt = process.argv.indexOf("--only");
  const only = onlyAt > 0 ? process.argv[onlyAt + 1] : undefined;
  const chosen = only ? all.filter((m) => m.id === only) : all;
  if (chosen.length === 0) fail(`mutants: no mutant ${only ?? ""}`);
  // The control run: the same tests, unmutated, must pass ("survived" is the good outcome).
  const control = await tryMutant(CONTROL(chosen.map((m) => m.test)));
  if (control !== "survived") fail("mutants: the mapped tests do not pass on unmutated HEAD");
  say("  control  mapped tests pass on unmutated HEAD");
  const results: Array<[string, Outcome]> = [];
  for (const m of chosen) {
    const outcome = await tryMutant(m);
    results.push([m.id, outcome]);
    say(`  ${outcome === "killed" ? "killed  " : outcome.padEnd(8)} ${m.id} -> ${m.test}`);
  }
  const bad = results.filter(([, o]) => o !== "killed");
  if (bad.length > 0) {
    fail(
      `mutants: ${bad.length} of ${results.length} not caught: ${bad.map(([id, o]) => `${id} (${o})`).join(", ")}`,
    );
  }
  say(`mutants ok: ${results.length}/${results.length} caught`);
};

if (import.meta.main) await main();
