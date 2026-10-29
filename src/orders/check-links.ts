/**
 * src/orders/check-links.ts — an order's links to the catalog are checked inside the order's
 * transaction (U5 BR1.1, BR1.2, BR4.3; S34; NFR1.16, NFR7.29; contract C3 amendment E1, C8).
 *
 * `checkLinks(sql, ctx, customerId, variantIds)` answers `ok` when the customer (if any) and
 * every variant (if any) belong to the session's business, and the shared `NotFound` for the
 * FIRST one that does not:
 *   - the customer through C8's `getCustomer` — one query; a non-UUID id is `NotFound` with
 *     no query at all;
 *   - the variants de-duplicated, then every non-UUID id is `NotFound` before any SQL (a
 *     malformed id must never reach a uuid column, where it would be a 500); then the UUIDs
 *     in chunks of at most 50 (C8_MAX_IDS) through C8's `variantLabels`, and an id missing
 *     from the answer is `NotFound`. The 200-line maximum therefore costs at most 4 queries
 *     (NFR-design review R-01).
 * Orders never name a catalog table in SQL; this module is their only read of the catalog's
 * existence checks (BR1.2, C8 rule 5). Callers place it (S34, review R-02): `createOrder`
 * before `nextOrderNumber`, so a refused order never burns an `ORD-####`; `updateOrder`
 * after the locked read and the editable check, so the error order is order not found, not
 * editable, then link not found. `linksToCheck` gives `updateOrder` only what the edit
 * changes, so an edit of neither customer nor lines runs no link query (iteration-2 residual).
 * Database errors are thrown, never caught (team.md Code Style).
 */
import { C8_MAX_IDS, getCustomer, variantLabels } from "../catalog/index.js";
import type { Queryable } from "../db/client.js";
import { notFound, type NotFound } from "../data/not-found.js";
import { err, ok, type Result } from "../data/result.js";
import { isUuid, type Uuid } from "../data/uuid.js";

interface LinkScope {
  readonly businessId: Uuid;
}

/** A UUID in Postgres's own lower-case form (an upper-case UUID is the same id); else as sent. */
const canonical = (id: string): string => (isUuid(id) ? id.toLowerCase() : id);

/** The distinct non-null variant ids of `variantIds`, in first-seen order. */
const distinctIds = (variantIds: ReadonlyArray<string | null>): string[] => [
  ...new Set(variantIds.filter((v): v is string => v !== null).map(canonical)),
];

export const checkLinks = async (
  sql: Queryable,
  ctx: LinkScope,
  customerId: string | null,
  variantIds: ReadonlyArray<string | null>,
): Promise<Result<void, NotFound>> => {
  if (customerId !== null) {
    const customer = await getCustomer(sql, ctx, canonical(customerId) as Uuid);
    if (!customer.ok) return customer;
  }
  const ids = distinctIds(variantIds);
  // S34: a malformed id is NotFound before any SQL.
  const malformed = ids.find((id) => !isUuid(id));
  if (malformed !== undefined) return err(notFound("Variant", malformed));
  for (let at = 0; at < ids.length; at += C8_MAX_IDS) {
    const chunk = ids.slice(at, at + C8_MAX_IDS) as Uuid[];
    const found = await variantLabels(sql, ctx, chunk);
    const missing = chunk.find((id) => !found.has(id));
    if (missing !== undefined) return err(notFound("Variant", missing));
  }
  return ok(undefined);
};

/** What an edit asks `checkLinks` to verify: only a changed customer and supplied lines. */
export interface LinksToCheck {
  readonly customerId: string | null;
  readonly variantIds: ReadonlyArray<string | null>;
}

export const linksToCheck = (
  beforeCustomerId: string | null,
  patch: {
    readonly customerId?: string | null | undefined;
    readonly items?: ReadonlyArray<{ readonly variantId: string | null }> | undefined;
  },
): LinksToCheck => ({
  customerId:
    patch.customerId !== undefined && patch.customerId !== beforeCustomerId
      ? patch.customerId
      : null,
  variantIds: patch.items ? patch.items.map((i) => i.variantId) : [],
});

/** True when `links` asks for no check at all, so the caller runs no query. */
export const nothingToCheck = (links: LinksToCheck): boolean =>
  links.customerId === null && links.variantIds.every((v) => v === null);
