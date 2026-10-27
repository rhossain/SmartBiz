/**
 * src/money/count-by-status.ts — counts grouped by a status string.
 * Used by the AuditTrail; U1's B1 stub takes the figures' recognition
 * as the "status" until order-status enum lands in B2.
 */
export const countByStatus = <K extends string>(
  figures: ReadonlyArray<{ readonly status: K }>,
): Readonly<Record<K, number>> => {
  const out: Record<string, number> = {};
  for (const f of figures) {
    out[f.status] = (out[f.status] ?? 0) + 1;
  }
  return out as Readonly<Record<K, number>>;
};
