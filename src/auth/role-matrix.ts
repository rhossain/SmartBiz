/**
 * src/auth/role-matrix.ts — role × capability matrix, exposed as
 * a typed Map for the three-layer gate (BR2.4). Re-exports the
 * capability helper for ergonomic imports.
 */
import { ROLES, type Capability, type Role } from "../data/enums.js";
import { capabilitiesFor, hasCapability } from "./capability.js";

export { capabilitiesFor, hasCapability };

export const ROLE_CAPABILITY_MATRIX: ReadonlyMap<Role, ReadonlySet<Capability>> = new Map(
  ROLES.map((r) => [r, capabilitiesFor(r)]),
);
