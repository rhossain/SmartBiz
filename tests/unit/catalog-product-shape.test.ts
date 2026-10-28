/**
 * tests/unit/catalog-product-shape.test.ts — axes, variants, suffixes and the low boundary
 * (U4 BR6.1, BR6.3–BR6.5, BR7.2; D12; SC9, S33; NFR5.10, NFR6.32).
 *
 * Restated: ≤ 2 axes; names 1–30 and distinct ignoring case; 1–12 values of 1–30 characters,
 * without '-', distinct ignoring case; variants exactly the cross product (one empty variant
 * with no axes); stock and minimum 0–1 000 000; suffix = values joined by '-'; full SKU =
 * SKU-suffix; low = stock BELOW minimum (the boundary mutant's test). The caps are checked at
 * 144 (accepted) and 145 (refused), and the largest valid request is under the 64 KiB body cap.
 */
import { describe, expect, test } from "bun:test";
import { ProductCreateSchema } from "../../src/catalog/schemas.js";
import {
  checkAxes,
  checkVariants,
  crossProduct,
  fullSku,
  isLow,
  skuSuffix,
} from "../../src/catalog/rules/product-shape.js";
import { largestProductRequest, productRequest } from "../helpers/catalog-fixtures.js";

const paths = (issues: ReadonlyArray<{ path: string }>): string[] => issues.map((i) => i.path);

describe("required and optional fields (BR6.1)", () => {
  test("name, SKU and selling price are required; category, cost and supplier are optional", () => {
    const full = productRequest("A");
    for (const key of ["name", "sku", "sellingPricePaise"] as const) {
      const without: Record<string, unknown> = { ...full };
      delete without[key];
      expect(ProductCreateSchema.safeParse(without).success).toBe(false);
    }
    const minimal: Record<string, unknown> = { ...full };
    for (const key of ["category", "purchaseCostPaise", "defaultSupplierId"]) delete minimal[key];
    expect(ProductCreateSchema.safeParse(minimal).success).toBe(true);
    expect(ProductCreateSchema.safeParse({ ...full, name: "" }).success).toBe(false);
  });
});

describe("axes (BR6.3)", () => {
  test("two named axes with distinct values are valid", () => {
    expect(checkAxes(productRequest("A").axes)).toEqual([]);
    expect(checkAxes([])).toEqual([]);
  });

  test("a third axis, a repeated name and a repeated value are refused", () => {
    const axis = { name: "x", values: ["a"] };
    expect(paths(checkAxes([axis, { ...axis, name: "y" }, { ...axis, name: "z" }]))).toContain(
      "axes",
    );
    expect(
      paths(
        checkAxes([
          { name: "Size", values: ["a"] },
          { name: "size", values: ["b"] },
        ]),
      ),
    ).toEqual(["axes.1.name"]);
    expect(paths(checkAxes([{ name: "s", values: ["M", "m"] }]))).toEqual(["axes.0.values.1"]);
  });

  test("a value with '-', an empty value and 13 values are refused; 12 are fine", () => {
    expect(paths(checkAxes([{ name: "s", values: ["X-L"] }]))).toEqual(["axes.0.values.0"]);
    expect(paths(checkAxes([{ name: "s", values: [" "] }]))).toEqual(["axes.0.values.0"]);
    const twelve = Array.from({ length: 12 }, (_, i) => `v${i}`);
    expect(checkAxes([{ name: "s", values: twelve }])).toEqual([]);
    expect(paths(checkAxes([{ name: "s", values: [...twelve, "v12"] }]))).toEqual([
      "axes.0.values",
    ]);
    expect(paths(checkAxes([{ name: "s", values: [] }]))).toEqual(["axes.0.values"]);
  });
});

describe("variants (BR6.4, BR6.5)", () => {
  test("the cross product is every combination in axis order; no axes is one empty variant", () => {
    expect(
      crossProduct([
        { name: "s", values: ["M", "L"] },
        { name: "c", values: ["r", "b"] },
      ]),
    ).toEqual([
      ["M", "r"],
      ["M", "b"],
      ["L", "r"],
      ["L", "b"],
    ]);
    expect(crossProduct([])).toEqual([[]]);
  });

  test("the exact cross product in any order is valid", () => {
    const r = productRequest("A");
    expect(checkVariants(r.axes, [...r.variants].reverse())).toEqual([]);
    expect(checkVariants([], [{ axisValues: [], stock: 0, minimumStock: 0 }])).toEqual([]);
  });

  test("a missing, a repeated or an unknown combination is refused on `variants`", () => {
    const r = productRequest("A");
    expect(paths(checkVariants(r.axes, r.variants.slice(1)))).toEqual(["variants"]);
    const first = r.variants[0]!;
    expect(paths(checkVariants(r.axes, [...r.variants.slice(1), r.variants[1]!]))).toEqual([
      "variants",
    ]);
    expect(
      paths(
        checkVariants(r.axes, [...r.variants.slice(1), { ...first, axisValues: ["S", "লাল"] }]),
      ),
    ).toEqual(["variants"]);
    expect(paths(checkVariants([], []))).toEqual(["variants"]);
  });

  test("stock and minimum must be whole numbers 0–1 000 000", () => {
    const r = productRequest("A");
    const bad = r.variants.map((v, i) => (i === 0 ? { ...v, stock: -1, minimumStock: 1.5 } : v));
    expect(paths(checkVariants(r.axes, bad))).toEqual([
      "variants.0.stock",
      "variants.0.minimumStock",
    ]);
    const big = r.variants.map((v, i) => (i === 1 ? { ...v, stock: 1_000_001 } : v));
    expect(paths(checkVariants(r.axes, big))).toEqual(["variants.1.stock"]);
  });

  test("suffix and full SKU, Bangla values kept as written", () => {
    expect(skuSuffix(["M", "লাল"])).toBe("M-লাল");
    expect(fullSku("KURTI", "M-লাল")).toBe("KURTI-M-লাল");
    expect(skuSuffix([])).toBe("");
    expect(fullSku("KURTI", "")).toBe("KURTI");
  });
});

describe("low stock boundary (BR7.2)", () => {
  test("below the minimum is low; AT the minimum is not", () => {
    expect(isLow(1, 2)).toBe(true);
    expect(isLow(2, 2)).toBe(false);
    expect(isLow(3, 2)).toBe(false);
    expect(isLow(0, 0)).toBe(false);
  });
});

describe("caps and body size (SC9, S33, NFR6.32, NFR5.10)", () => {
  test("144 variants (12 × 12) are accepted by the schema and the shape check", () => {
    const largest = largestProductRequest("BIG-1");
    expect(largest.variants).toHaveLength(144);
    const parsed = ProductCreateSchema.safeParse(largest);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(checkAxes(parsed.data.axes)).toEqual([]);
      expect(checkVariants(parsed.data.axes, parsed.data.variants)).toEqual([]);
    }
  });

  test("145 variants are refused by the schema", () => {
    const largest = largestProductRequest("BIG-1");
    const extra = { ...largest, variants: [...largest.variants, largest.variants[0]!] };
    const parsed = ProductCreateSchema.safeParse(extra);
    expect(parsed.success).toBe(false);
  });

  test("the largest valid product request is well under the 64 KiB body cap", () => {
    const bytes = new TextEncoder().encode(JSON.stringify(largestProductRequest("BIG-1"))).length;
    expect(bytes).toBeLessThan(65_536);
  });

  test("a value with '-' is refused by the schema itself", () => {
    const r = productRequest("A", { axes: [{ name: "s", values: ["X-L"] }] });
    expect(ProductCreateSchema.safeParse(r).success).toBe(false);
  });
});
