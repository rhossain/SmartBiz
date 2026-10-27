/**
 * scripts/check-coverage.ts — `bun run check:coverage`: the 80 % line floor over every `src`
 * file (team.md Testing Posture; NFR6.x; cicd-pipeline.md gate 6).
 *
 * It runs the unit + integration suites (plus tests/import-all.test.ts) with bun's text
 * coverage reporter, then:
 *   1. fails when the "All files" line figure is below 80 % — the floor is a constant here
 *      and is never lowered to make a run pass;
 *   2. fails when any `.ts`/`.tsx` file under `src/` is missing from the report, unless it is
 *      on the committed `coverage-exclude.json` list (type-only files, which have no runtime
 *      code for bun to count), each with its reason;
 *   3. fails when the test run itself fails.
 * It prints one line: `coverage ok: 97.52 % lines over 131 src files`.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fail, run, say } from "./lib/run.js";

export const LINE_FLOOR = 80;

const ROOT = join(import.meta.dir, "..");

interface Exclusion {
  readonly path: string;
  readonly reason: string;
}

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return walk(full);
    return /\.(ts|tsx)$/.test(name) && !name.endsWith(".d.ts") ? [full] : [];
  });

/** File → line % from bun's text table; plus the "All files" figure. */
export const parseReport = (
  text: string,
): { readonly all: number | null; readonly files: ReadonlyMap<string, number> } => {
  const files = new Map<string, number>();
  let all: number | null = null;
  for (const line of text.split("\n")) {
    const cells = line.split("|").map((c) => c.trim());
    if (cells.length < 3) continue;
    const lines = Number(cells[2]);
    if (!Number.isFinite(lines)) continue;
    if (cells[0] === "All files") all = lines;
    else if (cells[0]?.startsWith("src/")) files.set(cells[0], lines);
  }
  return { all, files };
};

const main = async (): Promise<void> => {
  const result = await run(
    [
      "bun",
      "test",
      "tests/unit",
      "tests/integration",
      "tests/import-all.test.ts",
      "--coverage",
      "--coverage-reporter=text",
    ],
    { cwd: ROOT, capture: true },
  );
  const { all, files } = parseReport(result.out);
  if (result.code !== 0) {
    process.stderr.write(result.out.slice(-4000));
    fail("coverage: the test run failed");
  }
  if (all === null) fail("coverage: the 'All files' line was not found in the report");
  const exclusions = JSON.parse(
    readFileSync(join(ROOT, "coverage-exclude.json"), "utf8"),
  ) as ReadonlyArray<Exclusion>;
  const excluded = new Set(exclusions.map((e) => e.path));
  const onDisk = walk(join(ROOT, "src")).map((f) => relative(ROOT, f));
  const missing = onDisk.filter((f) => !files.has(f) && !excluded.has(f));
  if (missing.length > 0)
    fail(`coverage: src files missing from the report: ${missing.join(", ")}`);
  const stale = [...excluded].filter((p) => files.has(p) || !onDisk.includes(p));
  if (stale.length > 0) {
    fail(
      `coverage: coverage-exclude.json lists files that are reported or gone: ${stale.join(", ")}`,
    );
  }
  if ((all ?? 0) < LINE_FLOOR) fail(`coverage: ${all} % lines is below the ${LINE_FLOOR} % floor`);
  say(
    `coverage ok: ${all} % lines over ${onDisk.length} src files (${excluded.size} type-only excluded)`,
  );
};

if (import.meta.main) await main();
