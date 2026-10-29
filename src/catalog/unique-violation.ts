/**
 * src/catalog/unique-violation.ts — the one database error the catalog translates (U4 BR4.3,
 * BR6.2; R16, R17; functional-spec §6; NFR-design review R-03; team.md Code Style "a DB error
 * is caught only to translate one named condition").
 *
 * Two races are decided by a unique constraint, and only those two are business outcomes:
 *   - two creates with the same SKU (any case) → `products_business_sku_lower_key`;
 *   - two revisions of one note → `customer_notes_revises_note_id_key`.
 * Each becomes 409 `conflict`. The match is on SQLSTATE 23505 AND the constraint name, so a
 * unique violation on any other constraint (a defect) is rethrown and answers a logged 500,
 * never a misleading conflict (the sign-up catch-all is the defect not to copy, team.md).
 * The translation runs outside the transaction, after Postgres has rolled it back, so the
 * losing attempt's change-log row is rolled back with it (BR10.1).
 */
export const SKU_UNIQUE = "products_business_sku_lower_key";
export const NOTE_REVISION_UNIQUE = "customer_notes_revises_note_id_key";

export type CatalogUniqueConstraint = typeof SKU_UNIQUE | typeof NOTE_REVISION_UNIQUE;

export const isUniqueViolationOn = (e: unknown, constraint: CatalogUniqueConstraint): boolean => {
  if (typeof e !== "object" || e === null) return false;
  const err = e as { code?: unknown; constraint_name?: unknown };
  return err.code === "23505" && err.constraint_name === constraint;
};
