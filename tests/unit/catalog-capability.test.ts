/**
 * tests/unit/catalog-capability.test.ts — who may do what in the catalog (U4 BR1.1–BR1.4,
 * BR9.2; S26, S27; NFR1.13, NFR1.14; Q1, Q2; NFR-design review R-05).
 *
 * The US5.1 table is RESTATED here by role (never derived from src/auth), and each catalog
 * capability set must open for exactly those roles:
 *   reads                         → every role
 *   customers and notes           → Owner, Manager, Sales Staff
 *   products, stock and suppliers → Owner, Manager            (named mutant: + money.mutate.price)
 *   purchase cost (change, see)   → Owner, Manager, Accountant
 * And the cost-equivalence pin: the roles holding `audit.view` are exactly the cost readers,
 * so a future change that shows change-log payloads (which carry cost) to another role fails
 * here (S27, review R-05).
 */
import { describe, expect, test } from "bun:test";
import { hasCapability } from "../../src/auth/capability.js";
import {
  canManageCatalog,
  canReadCatalog,
  canReadCost,
  canWriteCost,
  canWriteCustomers,
  CATALOG_MANAGE,
  COST_WRITE,
  CUSTOMER_WRITE,
} from "../../src/catalog/catalog-capability.js";
import { ROLES, type Role } from "../../src/data/enums.js";

const rolesWhere = (allowed: (r: Role) => boolean): Role[] => ROLES.filter(allowed);

describe("catalog capabilities match the US5.1 table (BR1.1–BR1.4)", () => {
  test("every role reads the catalog", () => {
    expect(rolesWhere(canReadCatalog)).toEqual(["owner", "manager", "sales_staff", "accountant"]);
  });

  test("customers and notes: Owner, Manager, Sales Staff — not the Accountant", () => {
    expect(rolesWhere(canWriteCustomers)).toEqual(["owner", "manager", "sales_staff"]);
  });

  test("products, stock and suppliers: Owner and Manager only", () => {
    expect(rolesWhere(canManageCatalog)).toEqual(["owner", "manager"]);
    expect(rolesWhere(canManageCatalog)).not.toContain("sales_staff");
  });

  test("purchase cost: Owner, Manager, Accountant — and only they see it (BR9.2)", () => {
    expect(rolesWhere(canWriteCost)).toEqual(["owner", "manager", "accountant"]);
    expect(rolesWhere(canReadCost)).toEqual(["owner", "manager", "accountant"]);
  });

  test("the constants name existing capabilities only (Q1: no new capability)", () => {
    for (const c of [...CUSTOMER_WRITE, ...CATALOG_MANAGE, ...COST_WRITE]) {
      expect(ROLES.some((r) => hasCapability(r, c))).toBe(true);
    }
  });
});

describe("cost equivalence (S27, review R-05)", () => {
  test("the roles holding audit.view are exactly the cost readers", () => {
    expect(rolesWhere((r) => hasCapability(r, "audit.view"))).toEqual(rolesWhere(canReadCost));
  });
});
