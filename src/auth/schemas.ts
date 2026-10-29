/**
 * src/auth/schemas.ts — the C2 request and response schemas (U1; BR2.4, BR3.8, BR6.4;
 * contract ownership rule 2: server and client import the same schema).
 *
 * Request schemas are `.strict()`: an unknown key — say a smuggled `role` or `businessId` —
 * is a 400 that lists the key, so a request can never choose its own role or business
 * (BR3.8). They check shape and length only; the email's form and the password's minimum
 * are domain rules (sign-up.ts), answered with the pass-through kinds `invalid_email` and
 * `password_too_short` (amendment A2). Passwords are never trimmed.
 *
 * Response schemas are not strict: the client strips unknown keys, so additive changes are
 * safe (C1 client rules). The module is browser-safe (zod and the shared kernel only).
 *
 * U3 (C6 with amendments B1–B5; S23; NFR1.9, NFR3.23; review F-05, F-08) adds the staff,
 * invitation and recovery schemas, shared by the server's handlers and src/client/staff-api.ts:
 *   - requests are `.strict()`: accept and reset take a token and a password ONLY, so a
 *     smuggled `role` or `businessId` is a 400 naming the key (NFR1.9); an invitation's role
 *     is one of manager / sales_staff / accountant, never owner (BR1.2);
 *   - invite and recover emails are trimmed and lower-cased by the schema (F-08, S23); their
 *     form is checked by the domain (`invalid_email`, B5) with `isValidEmail` below, which
 *     moved here from sign-up.ts so the browser can use the same rule without argon2;
 *   - responses: the staff list with `canReset`, `invitableRoles`, `truncated` (B2); the
 *     invitation with its `link` and the reset link with its `link` and `expiresAt` — the two
 *     allow-listed `link` responses (C5); accept's 201 is the public user (B4). Recover and
 *     reset have no body (202, 204).
 */
import { z } from "zod";
import { LocaleSchema, RoleSchema, SessionViewSchema, UuidSchema } from "../data/zod-schemas.js";
import { STAFF_ROLES } from "./delegation.js";

/** One `@`, something before it, a dot somewhere after it; no whitespace (U1 BR2.4). */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const EMAIL_MAX_LENGTH = 254;

/** U1 BR2.4's email rule, shared by sign-up, invite (B5) and the recover screen. */
export const isValidEmail = (email: string): boolean =>
  email.length >= 3 && email.length <= EMAIL_MAX_LENGTH && EMAIL_RE.test(email);

export const SignUpRequestSchema = z
  .object({
    businessName: z.string().trim().min(1).max(120),
    email: z.string().max(254),
    password: z.string().max(200),
  })
  .strict();
export type SignUpRequest = z.infer<typeof SignUpRequestSchema>;

export const SignInRequestSchema = z
  .object({
    email: z.string().max(254),
    password: z.string().max(200),
  })
  .strict();
export type SignInRequest = z.infer<typeof SignInRequestSchema>;

/** Sign-out takes no fields; the JSON body `{}` is still required (BR1.8). */
export const SignOutRequestSchema = z.object({}).strict();

export const HealthResponseSchema = z.object({
  status: z.literal("up"),
  db: z.enum(["up", "down"]),
});
export type HealthResponse = z.infer<typeof HealthResponseSchema>;

export const SetupResponseSchema = z.object({ businessExists: z.boolean() });
export type SetupResponse = z.infer<typeof SetupResponseSchema>;

/** `GET /api/business`: the name printed on invoices and delivery slips. */
export const BusinessResponseSchema = z.object({ name: z.string().min(1) });
export type BusinessResponse = z.infer<typeof BusinessResponseSchema>;

export const SessionResponseSchema = SessionViewSchema;
export type SessionResponse = z.infer<typeof SessionResponseSchema>;

/* ------------------------------------------------------------------ U3 (C6, B1–B5) */

/** F-08, S23: trimmed and lower-cased at the boundary; the form is the domain's check (B5). */
const EmailInputSchema = z.string().trim().toLowerCase().max(EMAIL_MAX_LENGTH);

export const StaffRoleSchema = z.enum(STAFF_ROLES as ["manager", "sales_staff", "accountant"]);
export type StaffRoleValue = z.infer<typeof StaffRoleSchema>;

/** `POST /api/staff/invitations` (W1). */
export const InviteRequestSchema = z
  .object({ email: EmailInputSchema, role: StaffRoleSchema })
  .strict();
export type InviteRequest = z.infer<typeof InviteRequestSchema>;

/** `POST /api/invitations/accept` (W2): a token and a password, nothing else (NFR1.9). */
export const AcceptInviteRequestSchema = z
  .object({ token: z.string().max(200), password: z.string().max(200) })
  .strict();
export type AcceptInviteRequest = z.infer<typeof AcceptInviteRequestSchema>;

/** `POST /api/auth/reset` (W5): the same two fields. */
export const ResetRequestSchema = z
  .object({ token: z.string().max(200), password: z.string().max(200) })
  .strict();
export type ResetRequest = z.infer<typeof ResetRequestSchema>;

/** `POST /api/auth/recover` (W6): any string up to 254 characters; nothing is checked. */
export const RecoverRequestSchema = z.object({ email: EmailInputSchema }).strict();
export type RecoverRequest = z.infer<typeof RecoverRequestSchema>;

/** `POST /api/staff/:userId/reset-links`: a non-UUID id is a 404 from the domain (C1). */
export const ResetLinkParamsSchema = z.object({ userId: z.string().min(1).max(100) }).strict();
export type ResetLinkParams = z.infer<typeof ResetLinkParamsSchema>;

export const StaffMemberSchema = z.object({
  id: UuidSchema,
  email: z.string(),
  role: RoleSchema,
  active: z.boolean(),
  canReset: z.boolean(),
});
export type StaffMemberResponse = z.infer<typeof StaffMemberSchema>;

export const PendingInvitationSchema = z.object({
  id: UuidSchema,
  email: z.string(),
  role: StaffRoleSchema,
  expiresAt: z.string(),
});
export type PendingInvitationResponse = z.infer<typeof PendingInvitationSchema>;

/** `GET /api/staff` (W7; B2). */
export const StaffListResponseSchema = z.object({
  members: z.array(StaffMemberSchema),
  invitations: z.array(PendingInvitationSchema),
  invitableRoles: z.array(StaffRoleSchema),
  truncated: z.boolean(),
});
export type StaffListResponse = z.infer<typeof StaffListResponseSchema>;

/** 201 of `POST /api/staff/invitations`: the link, once (C5 link allow-list). */
export const InviteResponseSchema = z.object({
  invitation: PendingInvitationSchema,
  link: z.string(),
});
export type InviteResponse = z.infer<typeof InviteResponseSchema>;

/** 201 of `POST /api/staff/:userId/reset-links`: the link, once, and when it ends. */
export const ResetLinkResponseSchema = z.object({ link: z.string(), expiresAt: z.string() });
export type ResetLinkResponse = z.infer<typeof ResetLinkResponseSchema>;

/** 201 of `POST /api/invitations/accept`: the public user; the session is the cookie (B4). */
export const AcceptInviteResponseSchema = z.object({
  id: UuidSchema,
  email: z.string(),
  role: RoleSchema,
  locale: LocaleSchema,
});
export type AcceptInviteResponse = z.infer<typeof AcceptInviteResponseSchema>;
