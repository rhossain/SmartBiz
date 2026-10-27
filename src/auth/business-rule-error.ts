/**
 * src/auth/business-rule-error.ts — typed business-rule failure.
 * The third layer returns a `BusinessRuleError` so the dispatcher
 * can distinguish "no session" (Layer 1) from "role lacks cap"
 * (Layer 2) from "rule violated" (Layer 3).
 */
export type BusinessRuleError =
  | { readonly kind: "tenant_mismatch"; readonly expected: string; readonly actual: string }
  | { readonly kind: "business_locked"; readonly reason: string }
  | { readonly kind: "limit_exceeded"; readonly limit: string; readonly count: number }
  | { readonly kind: "state_invalid"; readonly field: string; readonly reason: string };
