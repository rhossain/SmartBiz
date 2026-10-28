/**
 * src/auth/capability.ts — capability discriminated union + Set.
 * The role × capability matrix (Plan §7, BR2.1..BR2.4) is the
 * single source of truth. Tests assert gating by absence over
 * every route.
 */
import type { Capability, Role } from "../data/enums.js";

export const capabilitiesFor = (role: Role): ReadonlySet<Capability> => {
  switch (role) {
    case "owner":
      return new Set<Capability>([
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
      ]);
    case "manager":
      return new Set<Capability>([
        "business.view",
        "staff.invite",
        "settings.edit.own",
        "audit.view",
        "money.mutate.full",
      ]);
    case "sales_staff":
      return new Set<Capability>(["business.view", "settings.edit.own", "money.mutate.price"]);
    case "accountant":
      return new Set<Capability>([
        "business.view",
        "settings.edit.own",
        "audit.view",
        "money.mutate.cost",
      ]);
  }
};

export const hasCapability = (role: Role, cap: Capability): boolean =>
  capabilitiesFor(role).has(cap);
