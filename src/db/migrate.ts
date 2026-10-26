/**
 * migrate.ts — `bun run migrate` entry point.
 *
 * Reads SQL files in lexical order from `src/db/migrations/`,
 * applies each in its own transaction, and records applied
 * migrations in `_migrations(id, applied_at)`.
 *
 * Idempotent: re-running skips already-applied migrations.
 * The R1.1 CI test asserts that re-running does NOT re-grant
 * UPDATE/DELETE on audit_log.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

const url = process.env["DATABASE_URL"];
if (!url) {
  // eslint-disable-next-line no-console
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = postgres(url, { max: 2, prepare: false });

const migrationsDir = join(import.meta.dir, "migrations");

const ensureLedger = async (): Promise<void> => {
  await sql`
    CREATE TABLE IF NOT EXISTS _migrations (
      id         TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
};

const applied = new Set<string>();
const refreshApplied = async (): Promise<void> => {
  applied.clear();
  const rows = await sql<{ id: string }[]>`SELECT id FROM _migrations`;
  for (const r of rows) applied.add(r.id);
};

const applyOne = async (id: string, body: string): Promise<void> => {
  if (applied.has(id)) {
    // eslint-disable-next-line no-console
    console.log(`skip ${id}`);
    return;
  }
  await sql.begin(async (tx) => {
    await tx.unsafe(body);
    await tx`INSERT INTO _migrations (id) VALUES (${id})`;
  });
  // eslint-disable-next-line no-console
  console.log(`apply ${id}`);
};

const main = async (): Promise<void> => {
  await ensureLedger();
  await refreshApplied();
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const f of files) {
    const body = readFileSync(join(migrationsDir, f), "utf8");
    await applyOne(f, body);
  }
  await sql.end({ timeout: 5 });
  // eslint-disable-next-line no-console
  console.log(`migrate ok (${files.length} file(s))`);
};

main().catch((e: unknown) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});