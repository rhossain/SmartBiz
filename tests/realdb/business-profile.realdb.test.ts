/**
 * tests/realdb/business-profile.realdb.test.ts — the business-name read behind
 * `GET /api/business` on a real Postgres, as the app login (src/auth/business-profile.ts;
 * team.md: every new query shape gets a realdb test).
 *
 * Rules restated: the app role reads its business's name; another business id (no row) is
 * `not_found`, never another business's name.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, setDefaultTimeout, test } from "bun:test";
import { getBusinessProfile, updateBusinessProfile } from "../../src/auth/business-profile.js";
import { updateMyLocale } from "../../src/auth/user-locale.js";
import { MIGRATIONS_DIR } from "../../src/db/migrate.js";
import type { Uuid } from "../../src/data/uuid.js";
import { freshDatabase, realdbEnabled, type FreshDatabase } from "./fresh-database.js";

setDefaultTimeout(30_000);

const BIZ = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" as Uuid;
const OTHER = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" as Uuid;
const OWNER = "11111111-1111-4111-8111-111111111111" as Uuid;

describe.skipIf(!realdbEnabled)("business profile read on real Postgres", () => {
  let db: FreshDatabase;

  beforeAll(async () => {
    db = await freshDatabase("business_profile", true);
    await db.admin.begin(async (tx) => {
      await tx`INSERT INTO users (id, email, password_hash, role, business_id)
               VALUES (${OWNER}, 'owner@profile.test', 'x', 'owner', ${BIZ})`;
      await tx`INSERT INTO businesses (id, name, owner_user_id)
               VALUES (${BIZ}, 'রহিম ফ্যাশন হাউস', ${OWNER})`;
    });
  });

  afterAll(async () => {
    await db?.drop();
  });

  test("the app role reads its business's name; another id is not_found", async () => {
    expect(await getBusinessProfile(db.app, BIZ)).toEqual({
      ok: true,
      value: { name: "রহিম ফ্যাশন হাউস", phone: null, address: null, locale: "bn" },
    });
    expect(await getBusinessProfile(db.app, OTHER)).toEqual({
      ok: false,
      error: { kind: "not_found", entity: "Business", id: OTHER },
    });
  });

  test("the Owner's update is saved with its change-log row; the CHECKs refuse a bad phone", async () => {
    const ctx = { businessId: BIZ, actorUserId: OWNER, role: "owner" as const };
    const r = await updateBusinessProfile(db.app, ctx, {
      phone: "01711-000000",
      address: "মিরপুর ১০, ঢাকা",
      locale: "en",
    });
    expect(r).toEqual({
      ok: true,
      value: {
        name: "রহিম ফ্যাশন হাউস",
        phone: "01711000000",
        address: "মিরপুর ১০, ঢাকা",
        locale: "en",
      },
    });
    const rows = await db.admin<{ payload: unknown }[]>`
      SELECT payload FROM audit_log WHERE action = 'business.profile.update'`;
    expect(rows.map((x) => x.payload)).toEqual([{ changed: ["phone", "address", "locale"] }]);
    let refused = "";
    try {
      await db.admin`UPDATE businesses SET phone = '12345' WHERE id = ${BIZ}`;
    } catch (e) {
      refused = e instanceof Error ? e.message : String(e);
    }
    expect(refused).toContain("businesses_phone_check");
  });

  test("a person's own language is saved for them only", async () => {
    const r = await updateMyLocale(
      db.app,
      { businessId: BIZ, userId: OWNER, role: "owner" },
      { locale: "en" },
    );
    expect(r).toEqual({ ok: true, value: { locale: "en" } });
    const [row] = await db.admin<
      { locale: string }[]
    >`SELECT locale FROM users WHERE id = ${OWNER}`;
    expect(row?.locale).toBe("en");
  });

  test("migration 0025 applied a second time changes nothing", async () => {
    const body = readFileSync(join(MIGRATIONS_DIR, "0025_business_contact.sql"), "utf8");
    await db.admin.begin((tx) => tx.unsafe(body));
    const cols = await db.admin<{ column_name: string }[]>`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'businesses' AND column_name IN ('phone', 'address') ORDER BY column_name`;
    expect(cols.map((c) => c.column_name)).toEqual(["address", "phone"]);
    const checks = await db.admin<{ n: number }[]>`
      SELECT count(*)::int AS n FROM pg_constraint
      WHERE conname IN ('businesses_phone_check', 'businesses_address_check')`;
    expect(checks[0]?.n).toBe(2);
  });
});
