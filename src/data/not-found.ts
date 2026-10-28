/**
 * src/data/not-found.ts — the shared "not found" outcome (U4 functional-spec W11; BR14.1;
 * contract C8 note; review F-10).
 *
 * Moved here from src/orders/types.ts so that the catalog (src/catalog/) can return the same
 * value to the order write paths without importing the orders unit: U5's orders read the
 * catalog through C8, and a catalog → orders import would make the two units a cycle. A
 * missing id, an id of another business and an id that is not a UUID are all this one value
 * (BR11.2), so a caller can never learn that a foreign row exists.
 */
export type NotFound = { readonly kind: "not_found"; readonly entity: string; readonly id: string };

export const notFound = (entity: string, id: string): NotFound => ({
  kind: "not_found",
  entity,
  id,
});
