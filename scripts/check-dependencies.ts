/**
 * scripts/check-dependencies.ts — `bun scripts/check-dependencies.ts`: no unreviewed
 * dependency (U2 S17; NFR10.2; team.md Deployment "Zero spend"; cicd-pipeline.md gate 11).
 *
 * `package.json`'s `dependencies` and `devDependencies` must equal the committed list in
 * `tests/spec/dependencies.json`, name for name and version for version. Adding, removing or
 * re-versioning a package fails the gate until the list is updated in the same reviewed
 * commit, so a new dependency can never slip in with an unrelated change. Prints one line;
 * exit 1 naming every difference.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fail, say } from "./lib/run.js";

const ROOT = join(import.meta.dir, "..");

type Deps = Readonly<Record<string, string>>;

interface Manifest {
  readonly dependencies?: Deps;
  readonly devDependencies?: Deps;
}

/** Every difference between two dependency maps, as readable lines. */
export const diffDeps = (section: string, actual: Deps, expected: Deps): string[] => {
  const out: string[] = [];
  for (const [name, version] of Object.entries(actual)) {
    const want = expected[name];
    if (want === undefined) out.push(`${section}: ${name}@${version} is not on the list`);
    else if (want !== version) out.push(`${section}: ${name} is ${version}, the list says ${want}`);
  }
  for (const name of Object.keys(expected)) {
    if (actual[name] === undefined)
      out.push(`${section}: ${name} is on the list but not installed`);
  }
  return out;
};

export const compareManifests = (actual: Manifest, expected: Manifest): string[] => [
  ...diffDeps("dependencies", actual.dependencies ?? {}, expected.dependencies ?? {}),
  ...diffDeps("devDependencies", actual.devDependencies ?? {}, expected.devDependencies ?? {}),
];

const read = (path: string): Manifest =>
  JSON.parse(readFileSync(join(ROOT, path), "utf8")) as Manifest;

if (import.meta.main) {
  const actual = read("package.json");
  const differences = compareManifests(actual, read("tests/spec/dependencies.json"));
  if (differences.length > 0) {
    fail(`dependencies FAILED:\n  ${differences.join("\n  ")}`);
  }
  const count =
    Object.keys(actual.dependencies ?? {}).length +
    Object.keys(actual.devDependencies ?? {}).length;
  say(`dependencies ok: ${count} packages, equal to tests/spec/dependencies.json`);
}
