/**
 * scripts/log-summary.ts — `bun run logs:summary [file]`: what the server did, from its JSON
 * log lines (O1, O6; monitoring-design.md; NFR8.x).
 *
 * Reads `logs/smartbiz-<today>.log` (or the file given) — one JSON object per line, written by
 * src/observability/log.ts — and prints, per route pattern: requests, 2xx/4xx/5xx counts and
 * p50/p95 duration; then warn and error lines grouped by message (`db_unavailable`,
 * `internal_error`, `sign_in_limited`, …). Lines that are not JSON are counted and skipped.
 * The log holds no secret by construction (redacted at write), so the summary cannot either.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fail, say } from "./lib/run.js";

interface Line {
  readonly level?: string;
  readonly message?: string;
  readonly route?: string;
  readonly method?: string;
  readonly status?: number;
  readonly duration_ms?: number;
}

export const percentile = (values: ReadonlyArray<number>, p: number): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)] ?? 0;
};

export const summarize = (text: string): string[] => {
  const routes = new Map<string, { n: number; s2: number; s4: number; s5: number; ms: number[] }>();
  const events = new Map<string, number>();
  let skipped = 0;
  for (const raw of text.split("\n")) {
    if (raw.trim() === "") continue;
    let line: Line;
    try {
      line = JSON.parse(raw) as Line;
    } catch {
      skipped += 1;
      continue;
    }
    if (line.message === "request" && line.route) {
      const key = `${line.method ?? "?"} ${line.route}`;
      const r = routes.get(key) ?? { n: 0, s2: 0, s4: 0, s5: 0, ms: [] };
      r.n += 1;
      const s = line.status ?? 0;
      if (s >= 500) r.s5 += 1;
      else if (s >= 400) r.s4 += 1;
      else r.s2 += 1;
      if (typeof line.duration_ms === "number") r.ms.push(line.duration_ms);
      routes.set(key, r);
    } else if (line.level === "warn" || line.level === "error") {
      const key = `${line.level} ${line.message ?? "?"}`;
      events.set(key, (events.get(key) ?? 0) + 1);
    }
  }
  const out = ["route | requests | 2xx/3xx | 4xx | 5xx | p50 ms | p95 ms"];
  for (const [key, r] of [...routes].sort()) {
    out.push(
      `${key} | ${r.n} | ${r.s2} | ${r.s4} | ${r.s5} | ${percentile(r.ms, 50)} | ${percentile(r.ms, 95)}`,
    );
  }
  out.push("", "warnings and errors:");
  if (events.size === 0) out.push("  none");
  for (const [key, n] of [...events].sort()) out.push(`  ${key}: ${n}`);
  if (skipped > 0) out.push(`(${skipped} non-JSON lines skipped)`);
  return out;
};

const main = (): void => {
  const day = new Date().toISOString().slice(0, 10);
  const file = process.argv[2] ?? join(import.meta.dir, "..", "logs", `smartbiz-${day}.log`);
  if (!existsSync(file)) fail(`logs: ${file} does not exist`);
  for (const line of summarize(readFileSync(file, "utf8"))) say(line);
};

if (import.meta.main) main();
