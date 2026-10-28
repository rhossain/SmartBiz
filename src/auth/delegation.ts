/**
 * src/auth/delegation.ts — who may invite which role and reset whom (AuthComponent; U3 S20;
 * BR1.1–BR1.3; NFR1.10, NFR1.12; functional-design Q1, F-02, F-03).
 *
 * The delegation matrix as data. Invite, the reset link and the staff list all read it, so
 * the screen — which only shows what `GET /api/staff` says (`invitableRoles`, `canReset`) —
 * and the server cannot disagree:
 *
 *   caller        may invite                          may create a reset link for
 *   owner         manager, sales_staff, accountant    any member except the Owner and self
 *   manager       sales_staff, accountant             sales_staff and accountant, never self
 *   sales_staff   —                                   —
 *   accountant    —                                   —
 *   terminal      —                                   any active user (password-reset.ts)
 *
 * One level down prevents a capability gain (Q1, reworded by F-03): a Manager can never mint
 * a Manager, nor take over another Manager or the Owner. `owner` is never invitable (the
 * request schema and the table's CHECK refuse it too). Superseding a pending invitation is
 * limited the same way: a Manager may replace only an invitation it could have issued
 * (NFR1.12, F-02). Whether a reset target is active is not decided here: an inactive
 * target is a 409 `conflict`, not a 403 (BR1.3).
 */
import { assertNever } from "../data/assert-never.js";
import type { Role } from "../data/enums.js";
import type { Uuid } from "../data/uuid.js";

/** A role an invitation may carry: never `owner` (BR1.2). */
export type StaffRole = Exclude<Role, "owner">;

export const STAFF_ROLES: ReadonlyArray<StaffRole> = ["manager", "sales_staff", "accountant"];

/** BR1.2: the roles each caller may invite. */
export const INVITABLE: Readonly<Record<Role, ReadonlyArray<StaffRole>>> = {
  owner: ["manager", "sales_staff", "accountant"],
  manager: ["sales_staff", "accountant"],
  sales_staff: [],
  accountant: [],
};

/** Who is acting: the session's user and role, never anything from the request (BR3.8). */
export interface Actor {
  readonly id: Uuid;
  readonly role: Role;
}

/** True when `caller` may invite someone as `role` (BR1.2). */
export const canInvite = (caller: Role, role: Role): boolean =>
  (INVITABLE[caller] as ReadonlyArray<Role>).includes(role);

/** True when `caller` may replace a pending invitation that carries `pendingRole` (NFR1.12). */
export const canSupersede = (caller: Role, pendingRole: Role): boolean =>
  canInvite(caller, pendingRole);

/** BR1.3: may `caller` create a reset link for `target`? Never the Owner, never oneself. */
export const canResetTarget = (
  caller: Actor,
  target: { readonly id: string; readonly role: Role },
): boolean => {
  if (target.role === "owner" || target.id === caller.id) return false;
  switch (caller.role) {
    case "owner":
      return true;
    case "manager":
      return target.role === "sales_staff" || target.role === "accountant";
    case "sales_staff":
    case "accountant":
      return false;
    default:
      return assertNever(caller.role, "caller role");
  }
};
