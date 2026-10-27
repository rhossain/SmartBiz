/**
 * src/data/enums.ts — the shared vocabularies of SmartBiz (domain-design follow-up R-01, BR7.4).
 *
 * Every string-literal union that more than one component reads lives here, in the shared
 * kernel, so a feature never has to import another feature to name a role, a status or a
 * courier. Each list is the single source of truth for both the TypeScript union and the
 * zod enum built from it (src/data/zod-schemas.ts), so the two cannot drift.
 *
 * - `OrderStatus` is the nine-value union affirmed in team.md Testing Posture; the CHECK in
 *   0008_create_orders.sql mirrors it one-for-one.
 * - `OrderSource` covers the seven input modes of FR5.1 (photo, spreadsheet and voice are
 *   typed even though their bodies are deferred).
 * - `Role`, `Locale` and `Capability` are the role × capability matrix vocabulary; the
 *   matrix itself stays in AuthComponent (src/auth/capability.ts).
 */

export const ROLES = ["owner", "manager", "sales_staff", "accountant"] as const;
export type Role = (typeof ROLES)[number];

export const LOCALES = ["bn", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const CAPABILITIES = [
  "business.edit",
  "business.view",
  "staff.invite",
  "staff.manage",
  "settings.edit.own",
  "settings.edit.any",
  "audit.view",
  "money.mutate.full",
  "money.mutate.price",
  "money.mutate.cost",
] as const;
export type Capability = (typeof CAPABILITIES)[number];

export const ORDER_STATUSES = [
  "new",
  "confirmed",
  "packed",
  "shipped",
  "delivered",
  "settled",
  "cancelled",
  "returned",
  "partial",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_SOURCES = [
  "paste-parse",
  "manual",
  "repeat",
  "quick-add",
  "photo",
  "spreadsheet",
  "voice",
] as const;
export type OrderSource = (typeof ORDER_SOURCES)[number];

export const COURIERS = ["pathao", "steadfast", "redx"] as const;
export type Courier = (typeof COURIERS)[number];
