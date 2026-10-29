/**
 * src/catalog/match-index.ts — the read-only catalog view the paste screen matches against
 * (U5 W3, BR5.1; P26, S36, SC11; NFR1.17, NFR6.35, NFR6.38; contract C7 amendment E3).
 *
 * `matchIndex(sql, ctx)` needs `business.view` (every signed-in role; checked here again,
 * defence in depth) and answers the session's business's products ordered by name then id,
 * each with its variants ordered by axis values, in ONE query:
 *   - whole products only, cut on a running variant count at 2 000 variants; `truncated` is
 *     true when any variant was left out, so the screen can say not everything was matched;
 *   - the first product is always included, even alone above the cap (review R-04: U4 caps a
 *     product at 144 variants, so this cannot happen today, but the rule is defined);
 *   - products without variants cannot exist (U4 creates at least one), and the inner join
 *     would leave one out rather than invent a variant;
 *   - every row is filtered by `ctx.businessId`; the answer carries no cost and no stock
 *     (S36): the query does not select them and the response type has no field for them.
 * U4 has no inactive products, so every product is included (review R-05).
 * Infrastructure errors are thrown; a corrupt row (axes that are not a list) throws too.
 */
import type { Queryable } from "../db/client.js";
import { err, ok, type Result } from "../data/result.js";
import type { Uuid } from "../data/uuid.js";
import { canReadCatalog } from "./catalog-capability.js";
import { toAxes, toTextList, toWhole } from "./rows.js";
import type { CatalogContext } from "./types.js";

/** NFR6.38: the most variants one match index carries (whole products). */
export const MATCH_INDEX_MAX_VARIANTS = 2_000;

export interface MatchIndexVariant {
  readonly variantId: Uuid;
  readonly axisValues: ReadonlyArray<string>;
}

export interface MatchIndexProduct {
  readonly productId: Uuid;
  readonly name: string;
  readonly sku: string;
  readonly axisNames: ReadonlyArray<string>;
  readonly variants: ReadonlyArray<MatchIndexVariant>;
}

export interface MatchIndex {
  readonly products: ReadonlyArray<MatchIndexProduct>;
  readonly truncated: boolean;
}

interface MatchIndexRow {
  readonly product_id: string;
  readonly name: string;
  readonly sku: string;
  readonly axes: unknown;
  readonly variant_id: string;
  readonly axis_values: unknown;
  readonly total: string | number;
}

/** Group the ordered rows into products, keeping the query's order. */
const groupRows = (rows: ReadonlyArray<MatchIndexRow>): MatchIndexProduct[] => {
  const products: Array<{ head: MatchIndexProduct; variants: MatchIndexVariant[] }> = [];
  for (const row of rows) {
    let last = products[products.length - 1];
    if (last === undefined || last.head.productId !== row.product_id) {
      last = {
        head: {
          productId: row.product_id as Uuid,
          name: row.name,
          sku: row.sku,
          axisNames: toAxes(row.axes).map((a) => a.name),
          variants: [],
        },
        variants: [],
      };
      products.push(last);
    }
    last.variants.push({
      variantId: row.variant_id as Uuid,
      axisValues: toTextList(row.axis_values, "axis_values"),
    });
  }
  return products.map((p) => ({ ...p.head, variants: p.variants }));
};

export const matchIndex = async (
  sql: Queryable,
  ctx: CatalogContext,
  cap: number = MATCH_INDEX_MAX_VARIANTS,
): Promise<Result<MatchIndex, { readonly kind: "forbidden" }>> => {
  if (!canReadCatalog(ctx.role)) return err({ kind: "forbidden" });
  const rows = await sql<MatchIndexRow[]>`
    WITH counted AS (
      SELECT p.id, p.name, p.sku, p.axes, count(v.id) AS n
      FROM products p
      JOIN variants v ON v.business_id = p.business_id AND v.product_id = p.id
      WHERE p.business_id = ${ctx.businessId}
      GROUP BY p.id, p.name, p.sku, p.axes
    ), running AS (
      SELECT id, name, sku, axes,
             sum(n) OVER (ORDER BY name, id) AS upto,
             row_number() OVER (ORDER BY name, id) AS rn,
             sum(n) OVER () AS total
      FROM counted
    )
    SELECT r.id AS product_id, r.name, r.sku, r.axes, r.total, v.id AS variant_id, v.axis_values
    FROM running r
    JOIN variants v ON v.business_id = ${ctx.businessId} AND v.product_id = r.id
    WHERE r.upto <= ${cap} OR r.rn = 1
    ORDER BY r.name, r.id, v.axis_values
  `;
  const total = rows[0] === undefined ? 0 : toWhole(rows[0].total, "total");
  return ok({ products: groupRows(rows), truncated: total > rows.length });
};
