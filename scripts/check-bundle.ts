/**
 * scripts/check-bundle.ts — `bun run check:bundle`: the browser bundle's size and contents
 * (BR7.1, BR7.2; NFR6.x "bundle ≤ 350 KB gzip"; cicd-pipeline.md gate 9).
 *
 * Run after `bun run build`. It gzips every `dist/assets/*.js` and fails when the total is
 * over 350 KB, and it fails when any of them carries server code: a quoted `node:` module
 * specifier, the `postgres` or `argon2` packages, the `Bun.` global, `process.env`, or text
 * that only server modules contain (the session cookie name, the token and password hash
 * column names, the app login, the admin URL variable, the statement timeout). The lint
 * rules stop such imports at edit time; this proves the built output, which is what ships.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { fail, say } from "./lib/run.js";

export const MAX_GZIP_BYTES = 350 * 1024;

export const SERVER_MARKERS: ReadonlyArray<{ readonly id: string; readonly re: RegExp }> = [
  { id: "node: module specifier", re: /["'`]node:[a-z]/ },
  { id: "postgres package", re: /\bpostgres\b/ },
  { id: "argon2 package", re: /\bargon2\b/ },
  { id: "Bun global", re: /\bBun\./ },
  { id: "process.env", re: /\bprocess\.env\b/ },
  { id: "session cookie name", re: /__Host-sb_session/ },
  { id: "token hash column", re: /token_hash/ },
  { id: "password hash column", re: /password_hash/ },
  { id: "app login", re: /smartbiz_app/ },
  { id: "admin URL variable", re: /MIGRATE_DATABASE_URL/ },
  { id: "statement timeout", re: /statement_timeout/ },
];

export const findServerCode = (text: string): ReadonlyArray<string> =>
  SERVER_MARKERS.filter((m) => m.re.test(text)).map((m) => m.id);

const main = (): void => {
  const dir = join(import.meta.dir, "..", "dist", "assets");
  let names: string[];
  try {
    names = readdirSync(dir).filter((n) => n.endsWith(".js"));
  } catch {
    return fail("bundle: dist/assets is missing; run `bun run build` first");
  }
  if (names.length === 0) fail("bundle: no JavaScript in dist/assets");
  let total = 0;
  const problems: string[] = [];
  for (const name of names) {
    const text = readFileSync(join(dir, name), "utf8");
    total += gzipSync(text).length;
    for (const id of findServerCode(text)) problems.push(`${name}: ${id}`);
  }
  if (problems.length > 0)
    fail(`bundle: server code in the browser bundle: ${problems.join("; ")}`);
  const kb = (total / 1024).toFixed(1);
  if (total > MAX_GZIP_BYTES) fail(`bundle: ${kb} KB gzip is over the 350 KB limit`);
  say(`bundle ok: ${kb} KB gzip (limit 350 KB), no server code`);
};

if (import.meta.main) main();
