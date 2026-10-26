/**
 * src/data/zod-schemas.ts — runtime validators for the shared
 * entity types. Used at the boundary (HTTP/JSON request body,
 * env-parsed config, untrusted DB reads in tests). Internal code
 * should pass typed values; zod is for the edges.
 */
import { z } from "zod";

export const RoleSchema = z.enum(["owner", "manager", "sales_staff", "accountant"]);
export const LocaleSchema = z.enum(["bn", "en"]);
export const UuidSchema = z.string().uuid();

export const UserSchema = z.object({
  id: UuidSchema,
  email: z.string().email(),
  passwordHash: z.string().min(1),
  role: RoleSchema,
  active: z.boolean(),
  locale: LocaleSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const BusinessSchema = z.object({
  id: UuidSchema,
  name: z.string().min(1),
  locale: LocaleSchema,
  ownerUserId: UuidSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const InvitationSchema = z.object({
  id: UuidSchema,
  businessId: UuidSchema,
  email: z.string().email(),
  role: RoleSchema.exclude(["owner"] as never),
  acceptTokenHash: z.string().min(1),
  expiresAt: z.string(),
  usedAt: z.string().nullable(),
  createdBy: UuidSchema,
  createdAt: z.string(),
});

export const SessionSchema = z.object({
  id: UuidSchema,
  userId: UuidSchema,
  businessId: UuidSchema,
  issuedAt: z.string(),
  expiresAt: z.string(),
  lastSeenAt: z.string(),
});

export const AuditEntrySchema = z.object({
  id: UuidSchema,
  businessId: UuidSchema,
  actorUserId: UuidSchema.nullable(),
  correlationId: z.string().min(1),
  action: z.string().min(1),
  subjectKind: z.string().nullable(),
  subjectId: UuidSchema.nullable(),
  payload: z.record(z.unknown()),
  reversesId: UuidSchema.nullable(),
  occurredAt: z.string(),
  retentionUntil: z.string(),
});

export const PasswordResetSchema = z.object({
  id: UuidSchema,
  userId: UuidSchema,
  tokenHash: z.string().min(1),
  expiresAt: z.string(),
  usedAt: z.string().nullable(),
  createdAt: z.string(),
});

/** Helper used by the API surface to validate request bodies. */
export const parseOrError = <T>(
  schema: z.ZodType<T>,
  input: unknown,
): { ok: true; value: T } | { ok: false; error: string } => {
  const r = schema.safeParse(input);
  if (r.success) return { ok: true, value: r.data };
  return { ok: false, error: r.error.issues.map((i) => i.message).join("; ") };
};