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
 */
import { z } from "zod";
import { SessionViewSchema } from "../data/zod-schemas.js";

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

export const SessionResponseSchema = SessionViewSchema;
export type SessionResponse = z.infer<typeof SessionResponseSchema>;
