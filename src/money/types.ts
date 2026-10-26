/**
 * src/money/types.ts — Recognition (ADR-002).
 *
 * `earned` = customer owes (counted as a forecast, not yet in
 * the till). `realized` = settled (in the till). The MoneyEngine
 * never mixes them in a single total; the BasisPill UI shows the
 * basis so a "৳ 18,400" total can never be silently half earned
 * and half realized.
 */
export type Recognition = "earned" | "realized";

export type Completeness = "complete" | "partial" | "unknown";