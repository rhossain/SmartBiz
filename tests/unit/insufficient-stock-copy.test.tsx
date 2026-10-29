/**
 * tests/unit/insufficient-stock-copy.test.tsx — what the person reads when packing is refused
 * for stock (stock deduction on orders).
 *
 * Rule restated: the 409 `insufficient_stock` answer carries one field per short variant,
 * path `stock.<SKU>` and message `required N, available M`; the banner names each item with
 * both numbers, in Bangla digits for the Bangla locale. A malformed field is dropped, never
 * shown raw, and the message still says stock is short.
 */
import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { errorMessage, parseShortage } from "../../src/i18n/error-copy.js";
import { ErrorBanner } from "../../src/pres/ApiState.js";

const FIELDS = [
  { path: "stock.KURTI-SEED-M", message: "required 2, available 1" },
  { path: "stock.ORNA-L", message: "required 12, available 0" },
];

afterEach(() => cleanup());

describe("insufficient_stock copy", () => {
  test("parseShortage reads the SKU and both numbers; malformed fields are null", () => {
    expect(parseShortage(FIELDS[0]!)).toEqual({ sku: "KURTI-SEED-M", required: 2, available: 1 });
    expect(parseShortage({ path: "items.0", message: "required 2, available 1" })).toBeNull();
    expect(parseShortage({ path: "stock.X", message: "not enough" })).toBeNull();
  });

  test("Bangla names every item with Bangla digits", () => {
    expect(errorMessage("insufficient_stock", "bn", { fields: FIELDS })).toBe(
      "স্টকে যথেষ্ট মাল নেই: KURTI-SEED-M — দরকার ২, আছে ১; ORNA-L — দরকার ১২, আছে ০",
    );
  });

  test("English names every item", () => {
    expect(errorMessage("insufficient_stock", "en", { fields: FIELDS })).toBe(
      "Not enough stock: KURTI-SEED-M — need 2, have 1; ORNA-L — need 12, have 0",
    );
  });

  test("without usable fields the message is the plain sentence", () => {
    expect(errorMessage("insufficient_stock", "bn")).toBe("স্টকে যথেষ্ট মাল নেই");
    expect(
      errorMessage("insufficient_stock", "en", { fields: [{ path: "x", message: "y" }] }),
    ).toBe("Not enough stock");
  });

  test("the error banner shows the items from the answer's fields", () => {
    render(<ErrorBanner kind="insufficient_stock" locale="bn" fields={FIELDS} />);
    const banner = screen.getByTestId("error-banner");
    expect(banner.getAttribute("data-kind")).toBe("insufficient_stock");
    expect(screen.getByTestId("error-banner-message").textContent).toContain(
      "KURTI-SEED-M — দরকার ২, আছে ১",
    );
  });
});
