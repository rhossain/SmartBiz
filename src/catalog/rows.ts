/**
 * src/catalog/rows.ts — reading catalog rows from Postgres (U4 entities.md; BR3.2, BR6.5,
 * BR7.2).
 *
 * Rows are untrusted at this edge: BIGINT money arrives as a string, TIMESTAMPTZ as a Date,
 * JSONB parsed, `text[]` as an array. A value outside its domain (a risk level of 7, a
 * negative stock, axes that are not a list of {name, values}) means the row is corrupt, and
 * that throws — a fatal error, not an outcome a caller can act on — instead of being coerced
 * into a valid-looking entity (the order rows do the same, src/orders/order-rows.ts).
 */
import type { Uuid } from "../data/uuid.js";
import { fullSku, isLow } from "./rules/product-shape.js";
import type { Axis, Customer, RiskLevel, Variant } from "./types.js";

export const toIso = (value: Date | string): string =>
  value instanceof Date ? value.toISOString() : new Date(value).toISOString();

/** A whole number ≥ 0 (BIGINT arrives as a string); anything else is a corrupt row. */
export const toWhole = (value: string | number, column: string): number => {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(n) || n < 0) {
    throw new Error(`corrupt catalog row: ${column} is not a whole number (${String(value)})`);
  }
  return n;
};

export const toWholeOrNull = (value: string | number | null, column: string): number | null =>
  value === null ? null : toWhole(value, column);

export const toRisk = (value: string | number): RiskLevel => {
  const n = toWhole(value, "risk_level");
  if (n > 3) throw new Error(`corrupt catalog row: risk_level ${n}`);
  return n as RiskLevel;
};

export const toTextList = (value: unknown, column: string): string[] => {
  if (!Array.isArray(value) || value.some((v) => typeof v !== "string")) {
    throw new Error(`corrupt catalog row: ${column} is not a list of text`);
  }
  return value as string[];
};

export const toAxes = (value: unknown): Axis[] => {
  const parsed: unknown = typeof value === "string" ? JSON.parse(value) : value;
  if (!Array.isArray(parsed)) throw new Error("corrupt catalog row: axes is not a list");
  return parsed.map((a: unknown) => {
    const axis = a as { name?: unknown; values?: unknown };
    if (typeof axis.name !== "string") throw new Error("corrupt catalog row: axis name");
    return { name: axis.name, values: toTextList(axis.values, "axes.values") };
  });
};

export interface CustomerDbRow {
  readonly id: string;
  readonly name: string;
  readonly phone: string;
  readonly address: string | null;
  readonly risk_level: string | number;
  readonly created_at: Date | string;
  readonly updated_at: Date | string;
}

export const toCustomer = (r: CustomerDbRow): Customer => ({
  id: r.id as Uuid,
  name: r.name,
  phone: r.phone,
  address: r.address,
  riskLevel: toRisk(r.risk_level),
  createdAt: toIso(r.created_at),
  updatedAt: toIso(r.updated_at),
});

export interface VariantDbRow {
  readonly id: string;
  readonly axis_values: unknown;
  readonly sku_suffix: string;
  readonly stock: string | number;
  readonly minimum_stock: string | number;
}

/** BR6.5, BR7.2: the full SKU and `low` are computed on every read, never stored. */
export const toVariant = (r: VariantDbRow, productSku: string): Variant => {
  const stock = toWhole(r.stock, "stock");
  const minimumStock = toWhole(r.minimum_stock, "minimum_stock");
  return {
    id: r.id as Uuid,
    axisValues: toTextList(r.axis_values, "axis_values"),
    skuSuffix: r.sku_suffix,
    fullSku: fullSku(productSku, r.sku_suffix),
    stock,
    minimumStock,
    low: isLow(stock, minimumStock),
  };
};

/** Empty text after trimming is "not given" (an address or category of only spaces). */
export const blankToNull = (value: string | null | undefined): string | null =>
  value === null || value === undefined || value.trim() === "" ? null : value.trim();
