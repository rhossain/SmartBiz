/**
 * src/db/migrate.ts — the migration runner (`bun run migrate`; R4, NFR7.6).
 *
 * Reads the numbered `NNNN_verb_noun.sql` files of `src/db/migrations/` in lexical order,
 * applies each in its own transaction, and records it in the `_migrations(id, applied_at)`
 * ledger so it is applied once. Every file is also written idempotently, so a manual re-run
 * is harmless; a named stop (`users_without_business`, `users_email_case_duplicate`) raises
 * inside the file's transaction and leaves the database at the previous migration.
 *
 * Migrations run under the separate admin URL `MIGRATE_DATABASE_URL` (NFR2.3); the server
 * never reads it, and refuses to start when it is present in its own environment
 * (src/server/config.ts). `runMigrations` is exported for the realdb tests and the skeleton
 * check; the command-line entry runs only under `import.meta.main`, so importing this module
 * starts nothing (team.md Testing Posture, coverage of every `src` file).
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

export const MIGRATIONS_DIR = join(import.meta.dir, "migrations");

const MIGRATION_FILE = /^\d{4}_[a-z0-9_]+\.sql$/;

export interface MigrationReport {
  readonly applied: ReadonlyArray<string>;
  readonly skipped: ReadonlyArray<string>;
}

/** The migration files in the order they are applied. */
export const listMigrations = (dir: string = MIGRATIONS_DIR): ReadonlyArray<string> =>
  readdirSync(dir)
    .filter((f) => MIGRATION_FILE.test(f))
    .sort();

/**
 * Apply every pending migration against `url`. `onLine` receives one `apply <file>` or
 * `skip <file>` line per file. A failing file throws; earlier files stay applied.
 */
export const runMigrations = async (
  url: string,
  onLine: (line: string) => void = () => undefined,
  dir: string = MIGRATIONS_DIR,
): Promise<MigrationReport> => {
  // One connection, so each file's BEGIN/COMMIT runs on the same session; NOTICEs such as
  // "relation already exists, skipping" are expected on re-runs and are not printed.
  const sql = postgres(url, { max: 1, prepare: false, onnotice: () => undefined });
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS _migrations (
        id         TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;
    const done = new Set(
      (await sql<{ id: string }[]>`SELECT id FROM _migrations`).map((r) => r.id),
    );
    const applied: string[] = [];
    const skipped: string[] = [];
    for (const file of listMigrations(dir)) {
      if (done.has(file)) {
        skipped.push(file);
        onLine(`skip ${file}`);
        continue;
      }
      const body = readFileSync(join(dir, file), "utf8");
      await sql.begin(async (tx) => {
        await tx.unsafe(body);
        await tx`INSERT INTO _migrations (id) VALUES (${file})`;
      });
      applied.push(file);
      onLine(`apply ${file}`);
    }
    return { applied, skipped };
  } finally {
    await sql.end({ timeout: 5 });
  }
};

const main = async (): Promise<void> => {
  const url = process.env["MIGRATE_DATABASE_URL"];
  if (!url) {
    // eslint-disable-next-line no-console -- CLI entry: the one-line fail-fast message (BR1.3).
    console.error("MIGRATE_DATABASE_URL is not set (see .env.migrate.example)");
    process.exit(1);
  }
  // eslint-disable-next-line no-console -- CLI entry: one progress line per migration file.
  const report = await runMigrations(url, (line) => console.log(line));
  // eslint-disable-next-line no-console -- CLI entry: the summary line the gate reads.
  console.log(`migrate ok (${report.applied.length} applied, ${report.skipped.length} skipped)`);
};

if (import.meta.main) {
  main().catch((e: unknown) => {
    // Postgres error text can echo row values, so only the error code and message name are
    // printed; the admin URL never is.
    const code = (e as { code?: unknown }).code;
    const message = e instanceof Error ? e.message : String(e);
    // eslint-disable-next-line no-console -- CLI entry: the failure line before exit 1.
    console.error(`migrate failed${typeof code === "string" ? ` [${code}]` : ""}: ${message}`);
    process.exit(1);
  });
}
