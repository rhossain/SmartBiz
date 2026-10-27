/**
 * src/auth/role-matrix.ts — role × capability matrix, exposed as
 * a typed Map for the three-layer gate (BR2.4). Re-exports the
 * capability helper for ergonomic imports.
 */
import type { Capability, Role } from "./types.js";
import { capabilitiesFor, hasCapability } from "./capability.js";

export { capabilitiesFor, hasCapability };

export const ROLE_CAPABILITY_MATRIX: ReadonlyMap<Role, ReadonlySet<Capability>> = new Map(
  (["owner", "manager", "sales_staff", "accountant"] as Role[]).map((r) => [r, capabilitiesFor(r)]),
);
