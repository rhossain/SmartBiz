/**
 * tests/unit/parseMessage-catalog.test.ts — paste matching against the shop's own catalog
 * (U5 US4.2; AC4.2.1–AC4.2.3; BR5.2, BR5.3; S39, S39a; NFR5.11).
 *
 * The rules under test, restated here rather than imported (team.md §TP-8):
 *
 *     SEGMENT RULE: an item's details come from the item's own words.
 *     LINK RULE: an item is linked to a product only when its own words contain exactly ONE
 *       product's whole name (Latin names on word boundaries, Bangla names as a substring,
 *       names of at least 2 characters) or its SKU as a whole token of [A-Z0-9-]; several
 *       matches leave it unlinked and incomplete; none leaves it unlinked.
 *     VARIANT RULE: a linked item's variant is the one whose size and colour equal the item's
 *       OWN size and colour ("m" is "M", "Red" is "লাল"); a detail the product has no axis
 *       for is ignored; a missing detail on an axis with several values, or zero / several
 *       candidates, leaves the variant unpicked.
 * Every test checks the segment rule on the items it parses (`assertOwnWords`).
 */
import { describe, expect, test } from "bun:test";
import { linkItem, parseMessage, reparseItem } from "../../src/orders/parse-message.js";
import { prepareCatalog, type MatchIndexInput } from "../../src/orders/parse-message-segments.js";
import type { ParsedItem } from "../../src/orders/types.js";

/** The index as the server answers it (C7 E3), with readable ids. */
const INDEX: MatchIndexInput = {
  products: [
    {
      productId: "KURTI",
      name: "Cotton Kurti",
      sku: "KRT-01",
      axisNames: ["Size", "Colour"],
      variants: [
        { variantId: "KURTI-m-red", axisValues: ["m", "Red"] },
        { variantId: "KURTI-m-blue", axisValues: ["m", "Blue"] },
        { variantId: "KURTI-l-red", axisValues: ["L", "red "] },
        { variantId: "KURTI-l-blue", axisValues: ["l", "BLUE"] },
      ],
    },
    {
      productId: "SAREE",
      name: "Cotton Saree",
      sku: "SAR-7",
      axisNames: [],
      variants: [{ variantId: "SAREE-only", axisValues: [] }],
    },
    {
      productId: "ORNA",
      name: "জর্জেট ওড়না",
      sku: "ORN-2",
      axisNames: ["রং"],
      variants: [
        { variantId: "ORNA-lal", axisValues: ["লাল"] },
        { variantId: "ORNA-nil", axisValues: ["নীল"] },
      ],
    },
    {
      productId: "PANJABI",
      name: "পাঞ্জাবি",
      sku: "PNJ-1",
      // Named neither size nor colour: the kind comes from the values (all parser sizes).
      axisNames: ["মডেল"],
      variants: [
        { variantId: "PANJABI-M", axisValues: ["M"] },
        { variantId: "PANJABI-XL", axisValues: ["xl"] },
      ],
    },
    {
      productId: "SHIRT",
      name: "শার্ট",
      sku: "SHT-1",
      axisNames: ["কাপড়"],
      variants: [
        { variantId: "SHIRT-cotton", axisValues: ["সুতি"] },
        { variantId: "SHIRT-silk", axisValues: ["সিল্ক"] },
      ],
    },
    // A one-letter name is not a key; only its SKU links it.
    {
      productId: "X",
      name: "X",
      sku: "X-9",
      axisNames: [],
      variants: [{ variantId: "X-v", axisValues: [] }],
    },
  ],
};
const CATALOG = prepareCatalog(INDEX);

/** The variant ids' axis values, restated from INDEX, normalised by hand. */
const VARIANT_DETAILS: Readonly<Record<string, { size?: string; colour?: string }>> = {
  "KURTI-m-red": { size: "M", colour: "লাল" },
  "KURTI-m-blue": { size: "M", colour: "নীল" },
  "KURTI-l-red": { size: "L", colour: "লাল" },
  "KURTI-l-blue": { size: "L", colour: "নীল" },
  "ORNA-lal": { colour: "লাল" },
  "ORNA-nil": { colour: "নীল" },
  "PANJABI-M": { size: "M" },
  "PANJABI-XL": { size: "XL" },
};
const ENGLISH: Readonly<Record<string, string>> = { লাল: "red", নীল: "blue" };

/** SEGMENT RULE, restated: a linked variant's size and colour are in the item's own text. */
const assertOwnWords = (item: ParsedItem): void => {
  const details = item.variantId === null ? undefined : VARIANT_DETAILS[item.variantId];
  if (details?.size !== undefined) {
    expect(new RegExp(`(^|[^A-Za-z0-9])${details.size}($|[^A-Za-z0-9])`, "i").test(item.text)).toBe(
      true,
    );
  }
  if (details?.colour !== undefined) {
    const english = ENGLISH[details.colour] ?? "∅";
    expect(item.text.includes(details.colour) || item.text.toLowerCase().includes(english)).toBe(
      true,
    );
  }
};

const items = (message: string): ReadonlyArray<ParsedItem> => {
  const r = parseMessage(message, CATALOG);
  if (!r.ok) throw new Error(`parse failed: ${r.reason}`);
  r.items.forEach(assertOwnWords);
  return r.items;
};

const links = (message: string): Array<[string | null, string | null, boolean]> =>
  items(message).map((i) => [i.productId, i.variantId, i.incomplete]);

describe("LINK RULE — the two keys (BR5.2, AC4.2.1)", () => {
  test("a whole name links; a word two names share links nothing (Cotton Kurti / Cotton Saree)", () => {
    expect(links("Cotton Kurti M red 2pcs")).toEqual([["KURTI", "KURTI-m-red", false]]);
    expect(links("cotton saree 1pc")).toEqual([["SAREE", "SAREE-only", false]]);
    // "Cotton" alone is in both names but is neither name: unlinked, and not blocked.
    expect(links("cotton 1pc")).toEqual([[null, null, false]]);
  });

  test("a Latin name must sit on word boundaries", () => {
    expect(links("CottonKurti 1pc")).toEqual([[null, null, false]]);
    expect(links("xCotton Kurti 1pc")).toEqual([[null, null, false]]);
    expect(links("(Cotton Kurti) 1pc")).toEqual([["KURTI", null, false]]);
  });

  test("a SKU with a hyphen is one whole token, any case; a longer token is not it", () => {
    expect(links("KRT-01 L blue ১টা")).toEqual([["KURTI", "KURTI-l-blue", false]]);
    expect(links("krt-01 ১টা")).toEqual([["KURTI", null, false]]);
    expect(links("KRT-012 ১টা")).toEqual([[null, null, false]]);
    expect(links("XKRT-01 ১টা")).toEqual([[null, null, false]]);
    // A one-letter name is not a key, but its SKU is.
    expect(links("X ১টা")).toEqual([[null, null, false]]);
    expect(links("X-9 ১টা")).toEqual([["X", "X-v", false]]);
  });

  test("a Bangla name may be a substring of the item's word", () => {
    expect(links("জর্জেট ওড়নাটা লাল ১টা")).toEqual([["ORNA", "ORNA-lal", false]]);
  });
});

describe("LINK RULE — ambiguity (AC4.2.3, NFR5.11)", () => {
  test("words matching two products leave the item unlinked and incomplete, never the first", () => {
    expect(links("Cotton Kurti আর Cotton Saree সেট ১টা")).toEqual([
      ["KURTI", null, false],
      ["SAREE", "SAREE-only", false],
    ]);
    // In ONE segment both names appear: several matches.
    expect(links("Cotton Kurti Cotton Saree combo ১টা")).toEqual([[null, null, true]]);
    expect(links("KRT-01 SAR-7 ১টা")).toEqual([[null, null, true]]);
  });

  test("the person's pick links the ambiguous item and clears only the product ambiguity", () => {
    const [item] = items("KRT-01 SAR-7 ১টা");
    const picked = linkItem(item!, { productId: "SAREE", variantId: "SAREE-only" });
    expect([picked.productId, picked.variantId, picked.incomplete]).toEqual([
      "SAREE",
      "SAREE-only",
      false,
    ]);
    // Two sizes in its own words keep it incomplete even after a pick.
    const [twoSizes] = items("Cotton Kurti M L ১টা");
    expect(twoSizes?.incomplete).toBe(true);
    expect(linkItem(twoSizes!, { productId: "KURTI", variantId: null }).incomplete).toBe(true);
    expect(linkItem(picked, null)).toMatchObject({ productId: null, variantId: null });
  });
});

describe("VARIANT RULE — from the item's own size and colour (BR5.3, AC4.2.2)", () => {
  test('"Red" is লাল and "m" is M: a Bangla message picks a Latin-valued variant', () => {
    expect(links("Cotton Kurti লাল m ২টা")).toEqual([["KURTI", "KURTI-m-red", false]]);
    expect(links("Cotton Kurti নীল L ১টা")).toEqual([["KURTI", "KURTI-l-blue", false]]);
  });

  test("an axis named neither size nor colour takes its kind from its values", () => {
    expect(links("পাঞ্জাবি XL ১টা")).toEqual([["PANJABI", "PANJABI-XL", false]]);
    expect(links("পাঞ্জাবি ১টা")).toEqual([["PANJABI", null, false]]);
  });

  test("a colour on a size-only product is ignored for the pick and stays in the text", () => {
    const [item] = items("পাঞ্জাবি লাল M ১টা");
    expect([item?.variantId, item?.colour, item?.text.includes("লাল")]).toEqual([
      "PANJABI-M",
      "লাল",
      true,
    ]);
  });

  test("a missing detail on a many-valued axis, an 'other' axis, or no match leaves it unpicked", () => {
    expect(links("Cotton Kurti M ১টা")).toEqual([["KURTI", null, false]]);
    expect(links("শার্ট M ১টা")).toEqual([["SHIRT", null, false]]);
    expect(links("Cotton Kurti XL red ১টা")).toEqual([["KURTI", null, false]]);
  });

  test("a product with no axes always gets its one variant", () => {
    expect(links("Cotton Saree লাল XL ৩টা")).toEqual([["SAREE", "SAREE-only", false]]);
  });

  test("a detail fragment after the item fills its size, and the variant follows", () => {
    expect(links("Cotton Kurti লাল ১টা, M")).toEqual([["KURTI", "KURTI-m-red", false]]);
  });

  test("an edited item is re-read against the same catalog", () => {
    const item = reparseItem(1, "জর্জেট ওড়না নীল ১টা", CATALOG);
    expect([item.productId, item.variantId]).toEqual(["ORNA", "ORNA-nil"]);
    expect(reparseItem(1, "জর্জেট ওড়না নীল ১টা").productId).toBeNull();
  });
});

describe("SEGMENT RULE with a catalog (S39, NFR5.11)", () => {
  test("two products with Bangla connectors: each variant from its own words only", () => {
    const parsed = items("Cotton Kurti M লাল ১টা আর জর্জেট ওড়না নীল ২টা এবং পাঞ্জাবি XL ১টা");
    expect(parsed.map((i) => [i.productId, i.variantId, i.quantity])).toEqual([
      ["KURTI", "KURTI-m-red", 1],
      ["ORNA", "ORNA-nil", 2],
      ["PANJABI", "PANJABI-XL", 1],
    ]);
  });

  test("a detail line belongs to the item it follows, never to the one before it", () => {
    // "লাল" on its own line follows the orna, so the orna is red; the kurti has no colour,
    // so its many-valued colour axis leaves its variant unpicked rather than borrowing লাল.
    const parsed = items("Cotton Kurti M ১টা\nজর্জেট ওড়না ১টা\nলাল");
    expect(parsed.map((i) => [i.productId, i.variantId, i.colour])).toEqual([
      ["KURTI", null, null],
      ["ORNA", "ORNA-lal", "লাল"],
    ]);
    // The other way round: the colour before the next item's words stays with the kurti.
    const swapped = items("Cotton Kurti M লাল ১টা তারপর জর্জেট ওড়না ১টা");
    expect(swapped.map((i) => [i.productId, i.variantId])).toEqual([
      ["KURTI", "KURTI-m-red"],
      ["ORNA", null],
    ]);
  });

  test("the contact lines never link a product, and an unlinked item does not block the order", () => {
    const r = parseMessage("জর্জেট ওড়না লাল ১টা\nজুতা ১টা\nফারজানা\n01711234567", CATALOG);
    expect(r.ok && r.items.map((i) => [i.productId, i.incomplete])).toEqual([
      ["ORNA", false],
      [null, false],
    ]);
    expect(r.ok && r.contact.phone).toBe("01711234567");
  });
});

describe("prepareCatalog (S39a)", () => {
  test("keys and axis kinds are built once, normalised", () => {
    const [kurti, saree, orna, panjabi, shirt, x] = CATALOG;
    expect([kurti?.nameKey, kurti?.latinName, kurti?.skuKey]).toEqual([
      "COTTON KURTI",
      true,
      "KRT-01",
    ]);
    expect(kurti?.axes).toEqual([
      { kind: "size", values: ["M", "L"] },
      { kind: "colour", values: ["লাল", "নীল"] },
    ]);
    expect(saree?.axes).toEqual([]);
    expect([orna?.latinName, orna?.axes[0]?.kind]).toEqual([false, "colour"]);
    expect(panjabi?.axes[0]).toEqual({ kind: "size", values: ["M", "XL"] });
    expect(shirt?.axes[0]?.kind).toBe("other");
    expect(x?.nameKey).toBeNull();
  });
});
