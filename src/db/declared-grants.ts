/**
 * src/db/declared-grants.ts — the exact privileges `app_role` holds (contract C9, BR9.1,
 * NFR2.2), as typed data.
 *
 * The realdb gate (tests/realdb/grants.realdb.test.ts) and the skeleton check
 * (tests/e2e/wiring-check.ts) read the privileges Postgres reports for `app_role` on every
 * relation in the schema and compare them with this list as sets: an extra privilege, a
 * missing one, or a relation that is not listed fails the gate. A Unit that adds a table
 * adds its row here in the same commit (C9 ownership rule 6).
 *
 * Invariants restated: DELETE appears only on `sessions` (sign-out); `audit_log` is INSERT
 * and SELECT only (TC9, team.md Deployment); `order_items` is SELECT and INSERT only
 * (amendment A3: lines append by revision); U4's `customer_notes` is SELECT and INSERT only
 * (append-only notes, BR12.2).
 */

export const APP_ROLE = "app_role";

export type TablePrivilege = "SELECT" | "INSERT" | "UPDATE" | "DELETE";
export type SequencePrivilege = "USAGE" | "SELECT" | "UPDATE";

export type DeclaredGrant =
  | {
      readonly relation: string;
      readonly kind: "table";
      readonly privileges: ReadonlyArray<TablePrivilege>;
    }
  | {
      readonly relation: string;
      readonly kind: "sequence";
      readonly privileges: ReadonlyArray<SequencePrivilege>;
    };

export const DECLARED_GRANTS: ReadonlyArray<DeclaredGrant> = [
  { relation: "users", kind: "table", privileges: ["SELECT", "INSERT", "UPDATE"] },
  { relation: "businesses", kind: "table", privileges: ["SELECT", "INSERT", "UPDATE"] },
  { relation: "sessions", kind: "table", privileges: ["SELECT", "INSERT", "UPDATE", "DELETE"] },
  { relation: "invitations", kind: "table", privileges: ["SELECT", "INSERT", "UPDATE"] },
  { relation: "password_resets", kind: "table", privileges: ["SELECT", "INSERT", "UPDATE"] },
  { relation: "audit_log", kind: "table", privileges: ["SELECT", "INSERT"] },
  { relation: "orders", kind: "table", privileges: ["SELECT", "INSERT", "UPDATE"] },
  { relation: "order_items", kind: "table", privileges: ["SELECT", "INSERT"] },
  { relation: "consignment_link", kind: "table", privileges: ["SELECT", "INSERT"] },
  { relation: "orders_order_no_seq", kind: "sequence", privileges: ["USAGE", "SELECT"] },
  // U4 (C9 amendment D9; BR12.1, BR12.2; NFR2.6): the catalog, never DELETE; notes are
  // insert-only like the change log.
  { relation: "suppliers", kind: "table", privileges: ["SELECT", "INSERT", "UPDATE"] },
  { relation: "customers", kind: "table", privileges: ["SELECT", "INSERT", "UPDATE"] },
  { relation: "customer_notes", kind: "table", privileges: ["SELECT", "INSERT"] },
  { relation: "products", kind: "table", privileges: ["SELECT", "INSERT", "UPDATE"] },
  { relation: "variants", kind: "table", privileges: ["SELECT", "INSERT", "UPDATE"] },
];

/** `relation -> sorted privileges`, the shape the realdb gate compares against. */
export const declaredGrantMap = (): ReadonlyMap<string, ReadonlyArray<string>> =>
  new Map(DECLARED_GRANTS.map((g) => [g.relation, [...g.privileges].sort()]));
