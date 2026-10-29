/**
 * tests/realdb/business-profile.realdb.test.ts — the business-name read behind
 * `GET /api/business` on a real Postgres, as the app login (src/auth/business-profile.ts;
 * team.md: every new query shape gets a realdb test).
 *
 * Rules restated: the app role reads its business's name; another business id (no row) is
 * `not_found`, never another business's name.
 */
import { afterAll, beforeAll, describe, expect, setDefaultTimeout, test } from "bun:test";
import { getBusinessProfile } from "../../src/auth/business-profile.js";
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
      value: { name: "রহিম ফ্যাশন হাউস" },
    });
    expect(await getBusinessProfile(db.app, OTHER)).toEqual({
      ok: false,
      error: { kind: "not_found", entity: "Business", id: OTHER },
    });
  });
});
