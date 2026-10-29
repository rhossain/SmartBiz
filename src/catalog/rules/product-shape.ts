/**
 * src/catalog/rules/product-shape.ts — a product's axes and variants (U4 BR6.3–BR6.5, BR7.2;
 * D12; SC9; functional-design Q9, review F-08, F-12).
 *
 * Pure and shared by the server and the product form, so the screen's live variant preview
 * and the server check the same list (Q9: the server checks the variants it was shown, it
 * does not invent them):
 *   - BR6.3: at most 2 axes; an axis name is 1–30 characters and distinct ignoring case; an
 *     axis has 1–12 values, each 1–30 characters, without '-', distinct ignoring case. So a
 *     product has at most 12 × 12 = 144 variants and the request always fits the 64 KiB body
 *     cap (about 220 bytes a variant, S33);
 *   - BR6.4: the variants are exactly the cross product of the axis values, each combination
 *     once, in any order (with no axes: exactly one variant with no values); stock and
 *     minimum are whole numbers 0–1 000 000;
 *   - BR6.5: a variant's SKU suffix is its values joined by '-', and its full SKU is the
 *     product SKU plus '-' and the suffix (the SKU alone with no axes). Because a value cannot
 *     contain '-', different combinations always give different suffixes; values keep their
 *     own characters, Bangla included;
 *   - BR7.2: a variant is low when its stock is BELOW its minimum; at the minimum it is not.
 * Every problem is reported as a C1 field issue naming the path, never thrown.
 */
import type { FieldIssue } from "../../data/error-kinds.js";

export const MAX_AXES = 2;
export const MAX_AXIS_VALUES = 12;
export const MAX_VARIANTS = MAX_AXIS_VALUES * MAX_AXIS_VALUES;
export const MAX_AXIS_TEXT = 30;
export const MAX_STOCK = 1_000_000;

export interface AxisInput {
  readonly name: string;
  readonly values: ReadonlyArray<string>;
}

export interface VariantInput {
  readonly axisValues: ReadonlyArray<string>;
  readonly stock: number;
  readonly minimumStock: number;
}

const textOk = (s: string): boolean => {
  const t = s.trim();
  return t.length >= 1 && t.length <= MAX_AXIS_TEXT;
};

const repeatsIgnoringCase = (list: ReadonlyArray<string>, at: number): boolean => {
  const mine = (list[at] ?? "").trim().toLowerCase();
  return list.slice(0, at).some((other) => other.trim().toLowerCase() === mine);
};

/** BR6.3: every problem with the axes, as field issues (empty when the axes are valid). */
export const checkAxes = (axes: ReadonlyArray<AxisInput>): FieldIssue[] => {
  const issues: FieldIssue[] = [];
  if (axes.length > MAX_AXES) issues.push({ path: "axes", message: "at most 2 axes" });
  const names = axes.map((a) => a.name);
  axes.forEach((axis, i) => {
    if (!textOk(axis.name)) {
      issues.push({ path: `axes.${i}.name`, message: "an axis name is 1-30 characters" });
    } else if (repeatsIgnoringCase(names, i)) {
      issues.push({ path: `axes.${i}.name`, message: "axis names must differ" });
    }
    if (axis.values.length < 1 || axis.values.length > MAX_AXIS_VALUES) {
      issues.push({ path: `axes.${i}.values`, message: "an axis has 1-12 values" });
    }
    axis.values.forEach((value, j) => {
      const path = `axes.${i}.values.${j}`;
      if (!textOk(value)) issues.push({ path, message: "a value is 1-30 characters" });
      else if (value.includes("-")) issues.push({ path, message: "a value may not contain '-'" });
      else if (repeatsIgnoringCase(axis.values, j))
        issues.push({ path, message: "values of one axis must differ" });
    });
  });
  return issues;
};

/** Every combination of the axis values, in axis order (one empty combination with no axes). */
export const crossProduct = (axes: ReadonlyArray<AxisInput>): string[][] =>
  axes.reduce<string[][]>(
    (combos, axis) => combos.flatMap((combo) => axis.values.map((v) => [...combo, v])),
    [[]],
  );

const keyOf = (values: ReadonlyArray<string>): string => JSON.stringify(values);

const countOk = (n: number): boolean => Number.isInteger(n) && n >= 0 && n <= MAX_STOCK;

/** BR6.4: the variants must be the cross product exactly once, with valid stock numbers. */
export const checkVariants = (
  axes: ReadonlyArray<AxisInput>,
  variants: ReadonlyArray<VariantInput>,
): FieldIssue[] => {
  const issues: FieldIssue[] = [];
  const expected = new Set(crossProduct(axes).map(keyOf));
  const seen = new Set<string>();
  let exact = variants.length === expected.size && variants.length <= MAX_VARIANTS;
  for (const v of variants) {
    const key = keyOf(v.axisValues);
    if (!expected.has(key) || seen.has(key)) exact = false;
    seen.add(key);
  }
  if (!exact) {
    issues.push({
      path: "variants",
      message: "the variants must be every combination of the axis values, each once",
    });
  }
  variants.forEach((v, i) => {
    if (!countOk(v.stock)) issues.push({ path: `variants.${i}.stock`, message: "0-1000000" });
    if (!countOk(v.minimumStock))
      issues.push({ path: `variants.${i}.minimumStock`, message: "0-1000000" });
  });
  return issues;
};

/** BR6.5: the suffix is the values joined by '-' (empty with no axes). */
export const skuSuffix = (values: ReadonlyArray<string>): string => values.join("-");

/** BR6.5: the product SKU, plus '-' and the suffix when there is one. */
export const fullSku = (sku: string, suffix: string): string =>
  suffix === "" ? sku : `${sku}-${suffix}`;

/** BR7.2: low means strictly below the minimum. */
export const isLow = (stock: number, minimumStock: number): boolean => stock < minimumStock;

/** Variants in axis order (the order the product's axes list their values). */
export const byAxisOrder =
  (axes: ReadonlyArray<AxisInput>) =>
  (
    a: { readonly axisValues: ReadonlyArray<string> },
    b: { readonly axisValues: ReadonlyArray<string> },
  ): number => {
    for (const [i, axis] of axes.entries()) {
      const d =
        axis.values.indexOf(a.axisValues[i] ?? "") - axis.values.indexOf(b.axisValues[i] ?? "");
      if (d !== 0) return d;
    }
    return 0;
  };
