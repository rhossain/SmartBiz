/**
 * tests/realdb/reset-password-script.realdb.test.ts — `bun run reset-password <email>` as a
 * real process against a real database (U3 W4; BR6.1; S25; NFR3.25, NFR7.20; review I-03).
 *
 * The command is spawned exactly as the package script runs it, but with `--no-env-file` and an
 * explicit environment, so nothing from this machine's `.env` can leak in. Restated:
 *   - an active user's email (any case) → exit 0 and exactly ONE stdout line, the link
 *     `http://127.0.0.1:<PORT>/#/reset?t=<43 characters>`; nothing on stderr; one
 *     `auth.reset_link_created` row with no actor and `{targetUserId, by: null, via:
 *     "terminal"}`; the stored hash is the token's SHA-256; the link works once;
 *   - the Owner may be reset this way;
 *   - unknown or inactive email → exit 1, "no active account for that email", nothing written;
 *   - `MIGRATE_DATABASE_URL` set (with or without `DATABASE_URL`), or `DATABASE_URL` missing →
 *     exit 1 naming the variable, nothing written; the admin login as `DATABASE_URL` → exit 1
 *     (role check).
 * Database URLs come from the realdb environment (fresh-database.ts); none is written here.
 */
import { afterAll, describe, expect, test } from "bun:test";
import { join } from "node:path";
import { completeReset } from "../../src/auth/password-reset.js";
import { createHashGate } from "../../src/auth/hash-gate.js";
import { sha256 } from "../../src/auth/sha256.js";
import { signUp } from "../../src/auth/sign-up.js";
import { authDeps } from "../helpers/auth-fixtures.js";
import { freshDatabase, realdbEnabled, type FreshDatabase } from "./fresh-database.js";

const ROOT = join(import.meta.dir, "..", "..");
const SCRIPT = join(ROOT, "scripts", "reset-password.ts");
const PORT = "4321";

interface Run {
  readonly code: number;
  readonly out: string;
  readonly err: string;
}

const run = async (args: ReadonlyArray<string>, env: Record<string, string>): Promise<Run> => {
  const p = Bun.spawn(["bun", "--no-env-file", SCRIPT, ...args], {
    cwd: ROOT,
    env: { PATH: process.env["PATH"] ?? "", HOME: process.env["HOME"] ?? "", ...env },
    stdout: "pipe",
    stderr: "pipe",
  });
  const [out, err, code] = await Promise.all([
    new Response(p.stdout).text(),
    new Response(p.stderr).text(),
    p.exited,
  ]);
  return { code, out, err };
};

const opened: FreshDatabase[] = [];

describe.skipIf(!realdbEnabled)("reset-password command (W4)", () => {
  let db: FreshDatabase;
  const counts = async (): Promise<{ resets: number; audit: number }> => {
    const [row] = await db.admin<{ resets: number; audit: number }[]>`
      SELECT (SELECT count(*)::int FROM password_resets) AS resets,
             (SELECT count(*)::int FROM audit_log WHERE action = 'auth.reset_link_created') AS audit
    `;
    return row ?? { resets: -1, audit: -1 };
  };

  afterAll(async () => {
    for (const d of opened) await d.drop();
  });

  test("an active user: one stdout line with the link, the audit row, a working token", async () => {
    db = await freshDatabase("resetcmd");
    opened.push(db);
    const up = await signUp(
      db.app,
      { email: "owner@cmd.test", password: "correct-horse-1", businessName: "Acme", locale: "bn" },
      authDeps(),
    );
    if (!up.ok) throw new Error(up.error.kind);
    await db.admin`
      INSERT INTO users (id, business_id, email, password_hash, role, active, locale)
      VALUES ('e1000000-0000-4000-8000-0000000000e1', ${up.value.businessId}, 'gone@cmd.test', 'x', 'sales_staff', false, 'bn')
    `;

    const r = await run(["OWNER@cmd.test"], { DATABASE_URL: db.appUrl, PORT });
    expect({ code: r.code, err: r.err }).toEqual({ code: 0, err: "" });
    const lines = r.out.split("\n").filter((l) => l !== "");
    expect(lines).toHaveLength(1);
    expect(r.out.endsWith("\n")).toBe(true);
    const match = /^http:\/\/127\.0\.0\.1:4321\/#\/reset\?t=([A-Za-z0-9_-]{43})$/.exec(
      lines[0] ?? "",
    );
    expect(match).not.toBeNull();
    const token = match?.[1] ?? "";
    const [audit] = await db.admin<{ actor: string | null; payload: string }[]>`
      SELECT actor_user_id AS actor, payload::text AS payload FROM audit_log
      WHERE action = 'auth.reset_link_created'
    `;
    expect(audit?.actor).toBeNull();
    expect(JSON.parse(audit?.payload ?? "{}")).toEqual({
      targetUserId: up.value.user.id,
      by: null,
      via: "terminal",
    });
    const [stored] = await db.admin<{ h: string }[]>`SELECT token_hash AS h FROM password_resets`;
    expect(stored?.h).toBe(await sha256(token));
    const done = await completeReset(
      db.app,
      { token, password: "correct-horse-2", now: new Date() },
      { hashGate: createHashGate() },
    );
    expect(done.ok).toBe(true);

    // Unknown and inactive: exit 1, the message, nothing written.
    const before = await counts();
    for (const email of ["nobody@cmd.test", "gone@cmd.test"]) {
      const refused = await run([email], { DATABASE_URL: db.appUrl, PORT });
      expect({ email, code: refused.code, out: refused.out, err: refused.err }).toEqual({
        email,
        code: 1,
        out: "",
        err: "reset-password: no active account for that email\n",
      });
    }
    expect(await counts()).toEqual(before);
  });

  test("configuration refusals: admin URL, missing DATABASE_URL, superuser login (NFR7.20)", async () => {
    const before = await counts();
    const cases: Array<[string, Record<string, string>, RegExp]> = [
      ["admin URL only", { MIGRATE_DATABASE_URL: db.adminUrl }, /MIGRATE_DATABASE_URL/],
      [
        "admin URL beside the app URL",
        { MIGRATE_DATABASE_URL: db.adminUrl, DATABASE_URL: db.appUrl },
        /MIGRATE_DATABASE_URL/,
      ],
      ["no DATABASE_URL", { PORT }, /DATABASE_URL is not set/],
      ["the admin login as DATABASE_URL", { DATABASE_URL: db.adminUrl, PORT }, /superuser/],
      ["no email", { DATABASE_URL: db.appUrl, PORT }, /usage/],
    ];
    for (const [name, env, message] of cases) {
      const r = await run(name === "no email" ? [] : ["owner@cmd.test"], env);
      expect({ name, code: r.code, out: r.out }).toEqual({ name, code: 1, out: "" });
      expect({ name, names: message.test(r.err) }).toEqual({ name, names: true });
      expect(r.err.split("\n").filter((l) => l !== "")).toHaveLength(1);
      // The URLs carry passwords: never printed.
      expect(r.err.includes(db.adminUrl) || r.err.includes(db.appUrl)).toBe(false);
    }
    expect(await counts()).toEqual(before);
  });
});
