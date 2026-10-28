/**
 * scripts/reset-password.ts — `bun run reset-password <email>`: a 30-minute reset link for
 * any active user, printed on this machine's terminal (U3 W4; BR6.1; S25; NFR3.25, NFR7.20;
 * infrastructure-design Q2, D-05).
 *
 * The Owner's own way back in when the password is lost: whoever holds the terminal holds the
 * machine, so any active user may be reset this way, the Owner included (Q1, Q8). In order,
 * each refusal one line on stderr and exit 1, nothing written:
 *   1. `MIGRATE_DATABASE_URL` set → refuse: the command runs as the app login, never as the
 *      migration admin (least privilege, Q2);
 *   2. the server's own configuration reader (`readConfig`, D-05): `DATABASE_URL` missing or
 *      not a postgres URL, or a bad `PORT`, is named; `PORT` (default 3000) goes into the link;
 *   3. no email argument → the usage line;
 *   4. connect and run the server's role check: a superuser, or a login that is not a member
 *      of `app_role`, is refused;
 *   5. `createResetLink` with `via: "terminal", by: null` (src/auth/password-reset.ts): one
 *      transaction writes `auth.reset_link_created {targetUserId, by: null, via: "terminal"}`
 *      first, closes the user's other open links and inserts the new one (BR4.1, BR8.1). No
 *      ACTIVE user with that email, ignoring case → "no active account for that email".
 * On success exactly ONE line goes to stdout — the link — and nothing else is printed or
 * logged anywhere (NFR3.25): the link is a secret shown once.
 *
 * The package script loads `.env` (`bun --env-file=.env`), so the command finds the same app
 * login the server uses. `runResetPassword` takes its argv, environment, output and pool as
 * parameters so tests/realdb/reset-password-script.realdb.test.ts can drive it; the command
 * line entry runs only under `import.meta.main`.
 */
import { createResetLink } from "../src/auth/password-reset.js";
import { assertNever } from "../src/data/assert-never.js";
import { now } from "../src/data/clock.js";
import { checkRole, createPool, type Sql } from "../src/db/client.js";
import { readConfig } from "../src/server/config.js";

export interface ResetPasswordIo {
  readonly out: (line: string) => void;
  readonly err: (line: string) => void;
}

const say = (io: ResetPasswordIo, line: string): number => {
  io.err(`reset-password: ${line}`);
  return 1;
};

export const runResetPassword = async (
  argv: ReadonlyArray<string>,
  env: Readonly<Record<string, string | undefined>>,
  io: ResetPasswordIo,
  connect: (url: string) => Sql = (url) => createPool(url, 1),
): Promise<number> => {
  if (env["MIGRATE_DATABASE_URL"] !== undefined) {
    return say(io, "MIGRATE_DATABASE_URL must not be set (it is the admin URL); unset it");
  }
  const config = readConfig(env);
  if (!config.ok) return say(io, config.error);
  const email = argv[0];
  if (email === undefined || email.trim() === "") {
    return say(io, "usage: bun run reset-password <email>");
  }
  const sql = connect(config.value.databaseUrl);
  try {
    const role = await checkRole(sql);
    if (!role.ok) {
      return say(
        io,
        role.error.kind === "superuser"
          ? `database user ${role.error.user} is a superuser; use the app login in DATABASE_URL`
          : `database user ${role.error.user} is not a member of app_role`,
      );
    }
    const r = await createResetLink(sql, {
      via: "terminal",
      by: null,
      email,
      now: now(),
      port: config.value.port,
    });
    if (r.ok) {
      io.out(r.value.link);
      return 0;
    }
    switch (r.error.kind) {
      case "not_found":
      case "forbidden":
      case "conflict":
        return say(io, "no active account for that email");
      case "db_unavailable":
        return say(io, "the database is busy; run the command again");
      default:
        return assertNever(r.error, "reset link error");
    }
  } catch (e: unknown) {
    // Postgres text can echo row values and the URL holds a password: the code only.
    const code = (e as { code?: unknown }).code;
    return say(io, `the database could not be used${typeof code === "string" ? ` [${code}]` : ""}`);
  } finally {
    await sql.end({ timeout: 5 });
  }
};

if (import.meta.main) {
  const code = await runResetPassword(process.argv.slice(2), process.env, {
    out: (line) => process.stdout.write(`${line}\n`),
    err: (line) => process.stderr.write(`${line}\n`),
  });
  process.exit(code);
}
