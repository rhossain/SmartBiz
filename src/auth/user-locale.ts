/**
 * src/auth/user-locale.ts — a person's own display language (Settings page, mockups §17.3;
 * US1.5 AC1.5.2).
 *
 * Every signed-in role may change its own language (`settings.edit.own`); only the session's
 * own user row is touched, never another user's (the id comes from the session). The body is
 * a `.strict()` `{ locale: "bn" | "en" }`. One transaction: a `settings.update` change-log row
 * naming the field and its new value (a language is not personal data), then the update. A
 * request that changes nothing writes nothing. The app applies the saved language at every
 * sign-in and session load.
 */
import { z } from "zod";
import { insertAudit } from "../audit/audit-service.js";
import type { Sql } from "../db/client.js";
import { now } from "../data/clock.js";
import { LOCALES, type Locale, type Role } from "../data/enums.js";
import { err, ok, type Result } from "../data/result.js";
import type { Uuid } from "../data/uuid.js";
import { hasCapability } from "./capability.js";

export const LocaleUpdateSchema = z.object({ locale: z.enum(LOCALES) }).strict();

export interface UserContext {
  readonly businessId: Uuid;
  readonly userId: Uuid;
  readonly role: Role;
  readonly correlationId?: string;
}

export type LocaleError =
  | { readonly kind: "forbidden" }
  | { readonly kind: "not_found" }
  | {
      readonly kind: "invalid_input";
      readonly fields: ReadonlyArray<{ readonly path: string; readonly message: string }>;
    };

export const updateMyLocale = async (
  sql: Sql,
  ctx: UserContext,
  raw: unknown,
): Promise<Result<{ readonly locale: Locale }, LocaleError>> => {
  if (!hasCapability(ctx.role, "settings.edit.own")) return err({ kind: "forbidden" });
  const parsed = LocaleUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return err({
      kind: "invalid_input",
      fields: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }
  const { locale } = parsed.data;
  return sql.begin(async (tx): Promise<Result<{ readonly locale: Locale }, LocaleError>> => {
    const rows = await tx<{ locale: string }[]>`
      SELECT locale FROM users WHERE id = ${ctx.userId} AND business_id = ${ctx.businessId} FOR UPDATE
    `;
    const row = rows[0];
    if (!row) return err({ kind: "not_found" });
    if (row.locale === locale) return ok({ locale });
    await insertAudit(tx, {
      businessId: ctx.businessId,
      actorUserId: ctx.userId,
      action: "settings.update",
      subjectKind: "user",
      subjectId: ctx.userId,
      payload: { changed: ["locale"], locale },
      reversesId: null,
      ...(ctx.correlationId !== undefined ? { correlationId: ctx.correlationId } : {}),
    });
    await tx`
      UPDATE users SET locale = ${locale}, updated_at = ${now().toISOString()}
      WHERE id = ${ctx.userId} AND business_id = ${ctx.businessId}
    `;
    return ok({ locale });
  });
};
