/**
 * src/auth/business-profile.ts — the business's own details (Business page, mockups §17.2;
 * US1.5 AC1.5.1, AC1.5.4; printed on every invoice and delivery slip).
 *
 * Design decisions:
 *
 * - `getBusinessProfile`: every signed-in role reads it (`business.view`): the name, phone and
 *   address are printed on every invoice and slip, so they are not secret. Filtered by the
 *   session's business id like every other query (FR12.4); a missing row is `not_found`.
 * - `updateBusinessProfile`: the Owner only (`business.edit`). The body is a `.strict()` zod
 *   patch, validated before any SQL: name 1–120 characters, phone a Bangladeshi mobile number
 *   (`01XXXXXXXXX`, typed with spaces, dashes, +880 or Bangla digits allowed) or null to clear,
 *   address 1–300 characters or null, default language `bn` / `en`; at least one field.
 * - One transaction: lock the business row, compare, write ONE change-log row
 *   `business.profile.update` naming the changed fields — never their old or new values
 *   (AC1.5.4: the audit log is insert-only for 5 years, and a phone or address is personal
 *   data) — then update. A patch that changes nothing writes nothing.
 */
import { z } from "zod";
import { insertAudit } from "../audit/audit-service.js";
import type { Queryable, Sql } from "../db/client.js";
import { now } from "../data/clock.js";
import { LOCALES, type Locale, type Role } from "../data/enums.js";
import { notFound, type NotFound } from "../data/not-found.js";
import { err, ok, type Result } from "../data/result.js";
import type { Uuid } from "../data/uuid.js";
import { toAsciiDigits } from "../i18n/bnDigits.js";
import { hasCapability } from "./capability.js";

/** The stored phone shape: a Bangladeshi mobile number (same rule as a customer's phone). */
const PHONE = /^01[3-9][0-9]{8}$/;

/** Bangla digits, spaces, dashes and a +880 / 880 prefix are accepted as typed. */
export const normaliseBusinessPhone = (raw: string): string | null => {
  let s = toAsciiDigits(raw.trim()).replace(/[\s\-.()]/g, "");
  if (s.startsWith("+880")) s = `0${s.slice(4)}`;
  else if (s.startsWith("880")) s = `0${s.slice(3)}`;
  return PHONE.test(s) ? s : null;
};

export interface BusinessProfile {
  readonly name: string;
  readonly phone: string | null;
  readonly address: string | null;
  readonly locale: Locale;
}

export interface BusinessContext {
  readonly businessId: Uuid;
  readonly actorUserId: Uuid;
  readonly role: Role;
  readonly correlationId?: string;
}

/** The body of `PATCH /api/business`; the phone is normalised after parsing. */
export const BusinessPatchSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    phone: z.string().max(30).nullable().optional(),
    address: z.string().trim().min(1).max(300).nullable().optional(),
    locale: z.enum(LOCALES).optional(),
  })
  .strict()
  .refine((p) => Object.keys(p).length > 0, { message: "at least one field" });
export type BusinessPatch = z.infer<typeof BusinessPatchSchema>;

export type BusinessError =
  | NotFound
  | { readonly kind: "forbidden" }
  | {
      readonly kind: "invalid_input";
      readonly fields: ReadonlyArray<{ readonly path: string; readonly message: string }>;
    };

interface BusinessRow {
  readonly name: string;
  readonly phone: string | null;
  readonly address: string | null;
  readonly locale: string;
}

const toProfile = (row: BusinessRow): BusinessProfile => ({
  name: row.name,
  phone: row.phone,
  address: row.address,
  locale: row.locale === "en" ? "en" : "bn",
});

export const getBusinessProfile = async (
  sql: Queryable,
  businessId: Uuid,
): Promise<Result<BusinessProfile, NotFound>> => {
  const rows = await sql<BusinessRow[]>`
    SELECT name, phone, address, locale FROM businesses WHERE id = ${businessId}
  `;
  const row = rows[0];
  return row ? ok(toProfile(row)) : err(notFound("Business", businessId));
};

export const updateBusinessProfile = async (
  sql: Sql,
  ctx: BusinessContext,
  raw: unknown,
): Promise<Result<BusinessProfile, BusinessError>> => {
  if (!hasCapability(ctx.role, "business.edit")) return err({ kind: "forbidden" });
  const parsed = BusinessPatchSchema.safeParse(raw);
  if (!parsed.success) {
    return err({
      kind: "invalid_input",
      fields: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }
  const patch = parsed.data;
  let phone: string | null | undefined = undefined;
  if (patch.phone !== undefined) {
    phone =
      patch.phone === null || patch.phone.trim() === ""
        ? null
        : normaliseBusinessPhone(patch.phone);
    if (phone === null && patch.phone !== null && patch.phone.trim() !== "") {
      return err({ kind: "invalid_input", fields: [{ path: "phone", message: "invalid phone" }] });
    }
  }

  return sql.begin(async (tx): Promise<Result<BusinessProfile, BusinessError>> => {
    const rows = await tx<BusinessRow[]>`
      SELECT name, phone, address, locale FROM businesses WHERE id = ${ctx.businessId} FOR UPDATE
    `;
    const row = rows[0];
    if (!row) return err(notFound("Business", ctx.businessId));
    const before = toProfile(row);
    const after: BusinessProfile = {
      name: patch.name ?? before.name,
      phone: phone === undefined ? before.phone : phone,
      address: patch.address === undefined ? before.address : patch.address,
      locale: patch.locale ?? before.locale,
    };
    const changed = (["name", "phone", "address", "locale"] as const).filter(
      (k) => before[k] !== after[k],
    );
    if (changed.length === 0) return ok(before);
    await insertAudit(tx, {
      businessId: ctx.businessId,
      actorUserId: ctx.actorUserId,
      action: "business.profile.update",
      subjectKind: "business",
      subjectId: ctx.businessId,
      payload: { changed },
      reversesId: null,
      ...(ctx.correlationId !== undefined ? { correlationId: ctx.correlationId } : {}),
    });
    await tx`
      UPDATE businesses SET name = ${after.name}, phone = ${after.phone}, address = ${after.address},
        locale = ${after.locale}, updated_at = ${now().toISOString()}
      WHERE id = ${ctx.businessId}
    `;
    return ok(after);
  });
};
