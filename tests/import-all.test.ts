/**
 * tests/import-all.test.ts — every `src` module is imported once (team.md Testing Posture:
 * "the floor counts every src file with runtime code"; code-quality P-12).
 *
 * bun's coverage report lists only files a test loaded, so a module no test touches would
 * silently drop out of the 80 % floor. This test walks `src/` and imports every `.ts` and
 * `.tsx` file. Entry points keep start-up behind `import.meta.main` (server, migrate) or a
 * missing `#root` (the browser entry), so importing them starts nothing.
 * scripts/check-coverage.ts then fails when a file is still missing from the report and is
 * not on the committed type-only exclusion list.
 */
import { describe, expect, test } from "bun:test";
import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const SRC = join(import.meta.dir, "..", "src");

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return walk(full);
    return /\.(ts|tsx)$/.test(name) && !name.endsWith(".d.ts") ? [full] : [];
  });

describe("import every src module", () => {
  const files = walk(SRC);

  test("there are src modules to import", () => {
    expect(files.length).toBeGreaterThan(50);
  });

  test("each module imports without starting anything", async () => {
    for (const file of files) {
      const rel = relative(SRC, file);
      let error: string | null = null;
      try {
        await import(file);
      } catch (e: unknown) {
        error = e instanceof Error ? e.message : String(e);
      }
      expect({ rel, error }).toEqual({ rel, error: null });
    }
  });
});
