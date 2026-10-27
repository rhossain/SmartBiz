/**
 * tests/unit/gate-facts.test.ts — the pure parts of gate steps 5b, 11 and 14b (U2 P12, O12,
 * O14, S17; NFR6.16, NFR8.12, NFR8.15, NFR10.2; review I-01, I-05).
 *
 * Restated: the walk count sums every `walk … = <n> checks in <ms> ms` line; the browser
 * step maps exit 0 to `browser: ok (<median> ms, <n> screens)`, exit 2 to `browser: not run
 * (no Chrome)` — except under `--large`, where it fails — and anything else to a failure; the
 * dependency check names every added, removed or re-versioned package.
 */
import { describe, expect, test } from "bun:test";
import { compareManifests } from "../../scripts/check-dependencies.js";
import {
  browserFact,
  WALK_BUDGET_MS,
  WALK_FILES,
  walkChecks,
} from "../../scripts/lib/gate-facts.js";

describe("gate step 5b: walks", () => {
  test("sums the checks every walk printed; the budget is 60 s over the three walk files", () => {
    const out = [
      "walk server: 13 rows × 4 roles = 114 checks in 33 ms",
      "noise walk client: 1 = 2 checks in 3 ms",
      "walk client: 18 rows × 4 roles = 159 checks in 411 ms",
      "walk no-secret: 13 rows × 4 roles = 2403 checks in 1968 ms",
    ].join("\n");
    expect(walkChecks(out)).toBe(114 + 159 + 2403);
    expect(walkChecks("")).toBe(0);
    expect(WALK_BUDGET_MS).toBe(60_000);
    expect(WALK_FILES).toHaveLength(3);
  });
});

describe("gate step 14b: browser (I-01)", () => {
  const ok = "browser ok: median 640 ms over 5 loads, 14 screens at 360 px";
  test("exit 0 with its line is ok; exit 0 without the line is a failure", () => {
    expect(browserFact(0, ok, false)).toBe("browser: ok (640 ms, 14 screens)");
    expect(browserFact(0, "something else", false)).toBeNull();
  });
  test("exit 2 is 'not run' — never ok — and fails a --large (Bolt merge) run", () => {
    expect(browserFact(2, "", false)).toBe("browser: not run (no Chrome)");
    expect(browserFact(2, "", true)).toBeNull();
  });
  test("any other exit fails the gate", () => {
    for (const code of [1, 3, 130]) expect(browserFact(code, ok, false)).toBeNull();
  });
});

describe("gate step 11: the dependency list (S17)", () => {
  test("equal lists pass; additions, removals and new versions are each named", () => {
    const list = { dependencies: { zod: "4.6.7" }, devDependencies: { vite: "6.4.5" } };
    expect(compareManifests(list, list)).toEqual([]);
    expect(
      compareManifests(
        { dependencies: { zod: "4.6.8", lodash: "4.17.21" }, devDependencies: {} },
        list,
      ),
    ).toEqual([
      "dependencies: zod is 4.6.8, the list says 4.6.7",
      "dependencies: lodash@4.17.21 is not on the list",
      "devDependencies: vite is on the list but not installed",
    ]);
  });
});
