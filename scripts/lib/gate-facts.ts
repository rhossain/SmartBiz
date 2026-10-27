/**
 * scripts/lib/gate-facts.ts — the pure pieces of gate steps 5b and 14b (U2 P12, O12, O14;
 * NFR6.16, NFR8.12, NFR8.15; review I-01, I-05), kept apart from scripts/gate.ts so they are
 * unit-tested without starting a gate.
 */

/** NFR6.16: the three walks together must finish within this wall time. */
export const WALK_BUDGET_MS = 60_000;

export const WALK_FILES = [
  "tests/integration/server-gate-absence.test.ts",
  "tests/unit/three-layer-gate-absence.test.ts",
  "tests/integration/no-secret-responses.test.ts",
] as const;

/** The checks the walks printed (`walk <name>: … = <checks> checks in <ms> ms`), summed. */
export const walkChecks = (out: string): number =>
  [...out.matchAll(/^walk [\w-]+: .* = (\d+) checks in \d+ ms$/gm)].reduce(
    (sum, m) => sum + Number(m[1]),
    0,
  );

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
