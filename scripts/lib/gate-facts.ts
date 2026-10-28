/**
 * scripts/lib/gate-facts.ts — the pure pieces of gate steps 5b and 14b (U2 P12, O12, O14;
 * NFR6.16, NFR8.12, NFR8.15; review I-01, I-05, G-04, G-07), kept apart from scripts/gate.ts
 * so they are unit-tested without starting a gate.
 */

/** NFR6.16: the three walks together must finish within this wall time. */
export const WALK_BUDGET_MS = 60_000;

export const WALK_FILES = [
  "tests/integration/server-gate-absence.test.ts",
  "tests/unit/three-layer-gate-absence.test.ts",
  "tests/integration/no-secret-responses.test.ts",
] as const;

/** The name each walk file prints in its `walk <name>: …` line. */
export const WALK_NAMES = ["server", "client", "no-secret"] as const;
export type WalkName = (typeof WALK_NAMES)[number];

/** The checks each walk printed (`walk <name>: … = <n> checks in <ms> ms`); the last line wins. */
export const walkCounts = (out: string): Readonly<Partial<Record<WalkName, number>>> => {
  const counts: Partial<Record<WalkName, number>> = {};
  for (const m of out.matchAll(/^walk ([\w-]+): .* = (\d+) checks in \d+ ms$/gm)) {
    const name = m[1] as WalkName;
    if ((WALK_NAMES as ReadonlyArray<string>).includes(name)) counts[name] = Number(m[2]);
  }
  return counts;
};

/**
 * G-04: why step 5b must fail although the tests passed — a walk that printed nothing, or
 * checked nothing — or null when all three walks reported checks.
 */
export const walkProblem = (counts: Readonly<Partial<Record<WalkName, number>>>): string | null => {
  const silent = WALK_NAMES.filter((n) => (counts[n] ?? 0) === 0);
  return silent.length === 0 ? null : `walks reported no checks: ${silent.join(", ")}`;
};

/**
 * G-07: the walks reported separately — the role walks' checks apart from the no-secret
 * walk's string scans — with the wall time and, after an overrun, the rerun's time.
 */
export const walkFact = (
  counts: Readonly<Partial<Record<WalkName, number>>>,
  ms: number,
  rerunMs: number | null = null,
): string =>
  `walks server ${counts.server ?? 0} / client ${counts.client ?? 0} checks, ` +
  `no-secret ${counts["no-secret"] ?? 0} scans ${(ms / 1000).toFixed(1)} s` +
  (rerunMs === null ? "" : ` (rerun ${(rerunMs / 1000).toFixed(1)} s)`);

/**
 * I-01: the browser step's result-line fact for an exit code, or null when the gate must
 * fail. Exit 2 (no Chrome) is "not run" — never "ok" — and a `--large` run (a Bolt merge)
 * refuses it, so a Bolt cannot merge without real browser evidence.
 */
export const browserFact = (code: number, out: string, large: boolean): string | null => {
  if (code === 0) {
    const m = /browser ok: median (\d+) ms over \d+ loads, (\d+) screens/.exec(out);
    return m ? `browser: ok (${m[1]} ms, ${m[2]} screens)` : null;
  }
  if (code === 2 && !large) return "browser: not run (no Chrome)";
  return null;
};
