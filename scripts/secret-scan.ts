/**
 * scripts/secret-scan.ts — `bun run check:secrets`: no key, token or password in the repo
 * (team.md Code Style "Secret pattern scan"; NFR3.x; cicd-pipeline.md gate 12).
 *
 * Scans every file git would commit (tracked, plus untracked files not ignored) for:
 * private keys, cloud and service tokens (AWS, GitHub, Slack, OpenAI/Anthropic-style
 * `sk-` keys), a password inside a postgres URL, a long literal assigned to a
 * password/secret/token/api-key name, and any committed `.env` file other than the two
 * examples. A match fails the run unless `secret-scan.allow` lists it: each line is
 * `<path glob> <pattern id>  # reason`, and a line without a reason is itself an error, so
 * every exception is explained in the repo. It is free and local; no hosted scanner is a
 * gate (team.md Deployment "Zero spend").
 */
import { readFileSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { fail, run, say } from "./lib/run.js";

const ROOT = join(import.meta.dir, "..");
const MAX_BYTES = 1024 * 1024;

export interface Pattern {
  readonly id: string;
  readonly re: RegExp;
}

export const PATTERNS: ReadonlyArray<Pattern> = [
  { id: "private-key", re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { id: "aws-access-key", re: /\bAKIA[0-9A-Z]{16}\b/ },
  { id: "github-token", re: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/ },
  { id: "slack-token", re: /\bxox[baprs]-[A-Za-z0-9-]{10,}/ },
  { id: "sk-key", re: /\bsk-(?:ant-)?[A-Za-z0-9_-]{24,}/ },
  { id: "url-password", re: /postgres(?:ql)?:\/\/[^:\s/'"`@]+:(?!<|\$\{|\$[A-Z_])[^@\s'"`]+@/ },
  {
    id: "assigned-secret",
    re: /\b(?:password|passwd|secret|api[_-]?key|access[_-]?token)\b["']?\s*[:=]\s*["'][^"'\s]{12,}["']/i,
  },
];

const ALLOWED_ENV_FILES: ReadonlySet<string> = new Set([".env.example", ".env.migrate.example"]);

export interface AllowEntry {
  readonly glob: InstanceType<typeof Bun.Glob>;
  readonly source: string;
  readonly id: string;
}

export const parseAllow = (text: string): ReadonlyArray<AllowEntry> =>
  text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l !== "" && !l.startsWith("#"))
    .map((line) => {
      const [rule, reason] = line.split("#", 2).map((s) => s.trim());
      const [path, id] = (rule ?? "").split(/\s+/);
      if (!path || !id || !reason)
        throw new Error(`secret-scan.allow: needs "<glob> <id> # reason": ${line}`);
      return { glob: new Bun.Glob(path), source: path, id };
    });

export const scanText = (text: string): ReadonlyArray<{ id: string; line: number }> => {
  const hits: Array<{ id: string; line: number }> = [];
  text.split("\n").forEach((line, i) => {
    for (const p of PATTERNS) if (p.re.test(line)) hits.push({ id: p.id, line: i + 1 });
  });
  return hits;
};

const main = async (): Promise<void> => {
  const listed = await run(["git", "ls-files", "--cached", "--others", "--exclude-standard"], {
    cwd: ROOT,
    capture: true,
  });
  if (listed.code !== 0) fail("secrets: git ls-files failed");
  const allow = parseAllow(readFileSync(join(ROOT, "secret-scan.allow"), "utf8"));
  const allowed = (path: string, id: string): boolean =>
    allow.some((a) => a.id === id && a.glob.match(path));
  const findings: string[] = [];
  let scanned = 0;
  for (const path of listed.out.split("\n").filter((p) => p !== "")) {
    const name = basename(path);
    if (/^\.env(\..+)?$/.test(name) && !ALLOWED_ENV_FILES.has(name)) {
      if (!allowed(path, "env-file"))
        findings.push(`${path}: env-file (a .env file must never be committed)`);
      continue;
    }
    let size = 0;
    try {
      const st = statSync(join(ROOT, path));
      if (!st.isFile()) continue; // a submodule or linked directory
      size = st.size;
    } catch {
      continue; // listed but deleted in the working tree
    }
    if (size > MAX_BYTES) continue;
    const buf = readFileSync(join(ROOT, path));
    if (buf.includes(0)) continue; // binary
    scanned += 1;
    for (const hit of scanText(buf.toString("utf8"))) {
      if (!allowed(path, hit.id)) findings.push(`${path}:${hit.line}: ${hit.id}`);
    }
  }
  if (findings.length > 0)
    fail(`secrets: ${findings.length} unallowed match(es):\n  ${findings.join("\n  ")}`);
  say(`secrets ok: ${scanned} files scanned, ${allow.length} allow-list entries`);
};

if (import.meta.main) await main();
