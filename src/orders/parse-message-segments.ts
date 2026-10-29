/**
 * src/orders/parse-message-segments.ts — the segment-isolation rule (FR5.2).
 *
 *     "An item's details come from the item's own words."
 *
 * Why this file exists: the prototype's first parser scanned the whole
 * message for every product, so one product's colour was attributed to
 * all of them (the sample's pink dupatta came out black, because the
 * kurti's কালো appeared later and the last match won). The fix, carried
 * forward verbatim in intent from prototype/js/screens-orders.js, is to
 * cut the message into segments at its natural item boundaries and let
 * each item read only its own segment.
 *
 * Boundaries are line breaks, the punctuation `, ; + · ।`, and the
 * connector words আর, এবং, তারপর, এ, ও, ওর, আরো (and English "and"),
 * matched as whole whitespace-separated words so a connector inside a
 * longer word never splits it.
 *
 * Ambiguity is never resolved by guessing: two sizes, two colours or two
 * quantities inside one segment leave that detail empty and mark the
 * item incomplete, so the person picks. A wrong value is worse than an
 * empty one.
 *
 * U5 (US4.2; BR5.2, BR5.3; S39, S39a): the catalog. A segment links a product only through
 * that segment's own text and only when exactly ONE product matches; several leave the item
 * unlinked and incomplete. The variant is picked (`pickVariant`, called by parse-message.ts)
 * from the item's own size and colour, never from a neighbour's.
 */
import { assertNever } from "../data/assert-never.js";
import { toAsciiDigits } from "../i18n/bnDigits.js";

export const CONNECTORS: ReadonlyArray<string> = [
  "আর",
  "এবং",
  "তারপর",
  "এ",
  "ও",
  "ওর",
  "আরো",
  "and",
];

const HARD_BREAK = /\r?\n|[,;+·।]/;

export const SIZES: ReadonlyArray<string> = [
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "XXXL",
  "2XL",
  "3XL",
];

/** Canonical Bangla colour name plus the spellings customers use. */
export const COLOURS: ReadonlyArray<{
  readonly bn: string;
  readonly aliases: ReadonlyArray<string>;
}> = [
  { bn: "কালো", aliases: ["black"] },
  { bn: "সাদা", aliases: ["white"] },
  { bn: "লাল", aliases: ["red"] },
  { bn: "নীল", aliases: ["blue"] },
  { bn: "সবুজ", aliases: ["green"] },
  { bn: "হলুদ", aliases: ["yellow"] },
  { bn: "গোলাপি", aliases: ["pink"] },
  { bn: "বেগুনি", aliases: ["purple"] },
  { bn: "কমলা", aliases: ["orange"] },
  { bn: "খয়েরি", aliases: ["brown"] },
  { bn: "ধূসর", aliases: ["grey", "gray"] },
  { bn: "মেরুন", aliases: ["maroon"] },
  { bn: "আকাশি", aliases: ["sky"] },
];

/*
 * U5 (BR5.1–BR5.3; S39, S39a; P27; NFR5.11, NFR6.36): the catalog the parser matches
 * against. The paste screen loads the business's match index once (GET
 * /api/catalog/match-index, C7 amendment E3) and `prepareCatalog` turns it into these entries
 * ONCE per load, so no segment re-derives a key:
 *   - two match keys per product, never split into words (so "Cotton Kurti" and "Cotton
 *     Saree" are not both matched by "Cotton"): the whole NAME, trimmed, NFC-normalised,
 *     inner spaces collapsed (a segment's own spaces are single) and Latin letters
 *     upper-cased, matched as a phrase — a pure-ASCII name on word boundaries, any other
 *     name as a substring — and only when at least 2 characters long; and the SKU,
 *     upper-cased, matched as one whole token of the segment, tokens being runs of
 *     [A-Z0-9-];
 *   - each axis gets a kind (size, colour or other) from its name or, failing that, from
 *     whether every one of its values is a parser size / colour; values are normalised onto
 *     the parser's own vocabulary (a size upper-cased with ASCII digits, "m" → "M"; a colour
 *     to its canonical Bangla name through COLOURS, "Red" → "লাল"), so an item's size and
 *     colour can be compared with them directly.
 */

/** The match index as the server answers it (structurally; no catalog import, BR1.2). */
export interface MatchIndexInput {
  readonly products: ReadonlyArray<{
    readonly productId: string;
    readonly name: string;
    readonly sku: string;
    readonly axisNames: ReadonlyArray<string>;
    readonly variants: ReadonlyArray<{
      readonly variantId: string;
      readonly axisValues: ReadonlyArray<string>;
    }>;
  }>;
}

export type AxisKind = "size" | "colour" | "other";

export interface CatalogAxis {
  readonly kind: AxisKind;
  /** The axis's distinct values, normalised for its kind. */
  readonly values: ReadonlyArray<string>;
}

export interface CatalogVariant {
  readonly variantId: string;
  /** Normalised like the axis values, in axis order. */
  readonly axisValues: ReadonlyArray<string>;
}

/** A prepared product (S39a): its two match keys, its axes and its variants. */
export interface CatalogEntry {
  readonly productId: string;
  /** The normalised whole name; null when shorter than 2 characters (not a key). */
  readonly nameKey: string | null;
  /** True for a pure-ASCII name, which must start and end on a word boundary. */
  readonly latinName: boolean;
  readonly skuKey: string;
  readonly axes: ReadonlyArray<CatalogAxis>;
  readonly variants: ReadonlyArray<CatalogVariant>;
}

/** BR5.2: trimmed, NFC, single spaces, Latin letters upper-cased. */
export const matchText = (text: string): string =>
  text
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[a-z]/g, (c) => c.toUpperCase());

const SIZE_AXIS_NAMES: ReadonlyArray<string> = ["সাইজ", "সাইজের", "মাপ", "size"];
const COLOUR_AXIS_NAMES: ReadonlyArray<string> = ["রং", "রঙ", "কালার", "colour", "color"];

/** BR5.3: a size value upper-cased with Bangla digits made ASCII ("m" → "M"). */
export const normaliseSize = (value: string): string => toAsciiDigits(value.trim()).toUpperCase();

/** BR5.3: a colour value's canonical Bangla name ("Red" → "লাল"), or null when unknown. */
export const canonicalColour = (value: string): string | null => {
  const v = value.trim().normalize("NFC");
  const lower = v.toLowerCase();
  return COLOURS.find((c) => v.startsWith(c.bn) || c.aliases.includes(lower))?.bn ?? null;
};

const axisKind = (name: string, values: ReadonlyArray<string>): AxisKind => {
  const folded = name.trim().normalize("NFC").toLowerCase();
  if (SIZE_AXIS_NAMES.includes(folded)) return "size";
  if (COLOUR_AXIS_NAMES.includes(folded)) return "colour";
  if (values.length > 0 && values.every((v) => SIZES.includes(normaliseSize(v)))) return "size";
  if (values.length > 0 && values.every((v) => canonicalColour(v) !== null)) return "colour";
  return "other";
};

const normaliseValue = (kind: AxisKind, value: string): string => {
  switch (kind) {
    case "size":
      return normaliseSize(value);
    case "colour":
      return canonicalColour(value) ?? value.trim().normalize("NFC");
    case "other":
      return value.trim().normalize("NFC");
    default:
      return assertNever(kind, "axis kind");
  }
};

/** S39a: build the prepared entries once per match-index load. */
export const prepareCatalog = (index: MatchIndexInput): ReadonlyArray<CatalogEntry> =>
  index.products.map((p) => {
    const kinds = p.axisNames.map((name, i) =>
      axisKind(
        name,
        p.variants.map((v) => v.axisValues[i] ?? ""),
      ),
    );
    const variants = p.variants.map((v) => ({
      variantId: v.variantId,
      axisValues: kinds.map((kind, i) => normaliseValue(kind, v.axisValues[i] ?? "")),
    }));
    const name = matchText(p.name);
    return {
      productId: p.productId,
      nameKey: [...name].length >= 2 ? name : null,
      // eslint-disable-next-line no-control-regex -- "pure ASCII" is exactly U+0000–U+007F
      latinName: /^[\x00-\x7F]+$/.test(name),
      skuKey: p.sku.trim().toUpperCase(),
      axes: kinds.map((kind, i) => ({
        kind,
        values: [...new Set(variants.map((v) => v.axisValues[i] ?? ""))],
      })),
      variants,
    };
  });

const isWordChar = (c: string | undefined): boolean => c !== undefined && /[A-Z0-9]/.test(c);

/*
 * P27, NFR6.36: lookups over the prepared entries, built ONCE per catalog (cached on the
 * array itself), so a segment costs work in proportion to its own length, not the
 * catalog's: SKUs by key, names by their first two characters, entries by product id.
 */
interface CatalogLookup {
  readonly bySku: ReadonlyMap<string, ReadonlyArray<string>>;
  readonly byPrefix: ReadonlyMap<string, ReadonlyArray<CatalogEntry>>;
  readonly byId: ReadonlyMap<string, CatalogEntry>;
}

const LOOKUPS = new WeakMap<ReadonlyArray<CatalogEntry>, CatalogLookup>();

const push = <V>(map: Map<string, V[]>, key: string, value: V): void => {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
};

const lookupOf = (catalog: ReadonlyArray<CatalogEntry>): CatalogLookup => {
  const cached = LOOKUPS.get(catalog);
  if (cached) return cached;
  const bySku = new Map<string, string[]>();
  const byPrefix = new Map<string, CatalogEntry[]>();
  for (const p of catalog) {
    push(bySku, p.skuKey, p.productId);
    if (p.nameKey !== null) push(byPrefix, p.nameKey.slice(0, 2), p);
  }
  const built = { bySku, byPrefix, byId: new Map(catalog.map((p) => [p.productId, p])) };
  LOOKUPS.set(catalog, built);
  return built;
};

/** The prepared entry of a product id, if the catalog holds it. */
export const catalogEntry = (
  catalog: ReadonlyArray<CatalogEntry>,
  productId: string,
): CatalogEntry | undefined =>
  catalog.length === 0 ? undefined : lookupOf(catalog).byId.get(productId);

/**
 * BR5.2: the products whose name phrase or SKU token occurs in this segment's own text. A
 * name is tried at every position of the segment whose two characters start it; a pure-ASCII
 * name must also start and end on a word boundary there.
 */
const matchProducts = (
  segment: string,
  ascii: string,
  catalog: ReadonlyArray<CatalogEntry>,
): string[] => {
  if (catalog.length === 0) return [];
  const lookup = lookupOf(catalog);
  const found = new Set<string>();
  for (const token of ascii.toUpperCase().match(/[A-Z0-9-]+/g) ?? []) {
    for (const id of lookup.bySku.get(token) ?? []) found.add(id);
  }
  const scope = matchText(segment);
  for (let at = 0; at + 1 < scope.length; at += 1) {
    for (const p of lookup.byPrefix.get(scope.slice(at, at + 2)) ?? []) {
      const key = p.nameKey ?? "";
      if (!scope.startsWith(key, at)) continue;
      if (p.latinName && (isWordChar(scope[at - 1]) || isWordChar(scope[at + key.length])))
        continue;
      found.add(p.productId);
    }
  }
  return [...found];
};

/**
 * BR5.3: the variant of a linked product picked from the item's OWN size and colour only.
 * Candidates start as every variant; a size axis keeps the variants equal to the item's size
 * (or is unresolved when the item has none and the axis has several values); a colour axis
 * likewise; an "other" axis with several values is unresolved. A detail the product has no
 * axis for is ignored. Exactly one candidate left is the variant; otherwise none.
 */
export const pickVariant = (
  entry: CatalogEntry,
  item: { readonly size: string | null; readonly colour: string | null },
): string | null => {
  let candidates = entry.variants;
  for (const [i, axis] of entry.axes.entries()) {
    const wanted = axis.kind === "size" ? item.size : axis.kind === "colour" ? item.colour : null;
    if (wanted !== null) candidates = candidates.filter((v) => v.axisValues[i] === wanted);
    else if (axis.values.length > 1) return null;
  }
  return candidates.length === 1 ? (candidates[0]?.variantId ?? null) : null;
};

export interface SegmentDetails {
  readonly text: string;
  readonly isItem: boolean;
  readonly quantity: number;
  readonly size: string | null;
  readonly colour: string | null;
  readonly productId: string | null;
  readonly ambiguous: boolean;
  /** Every word is a size, a colour or a detail label ("সাইজ", "রং"). */
  readonly detailOnly: boolean;
}

/* Words that only introduce a detail. A fragment made of these plus a
   size or colour is a pure detail ("সাইজ M"); any other word means the
   fragment may name something else, so it is never folded into an item. */
const DETAIL_LABELS: ReadonlyArray<string> = [
  "সাইজ",
  "সাইজের",
  "রং",
  "রঙ",
  "কালার",
  "SIZE",
  "COLOUR",
  "COLOR",
];

const isDetailWord = (token: string): boolean => {
  const upper = toAsciiDigits(token).toUpperCase();
  return (
    SIZES.includes(upper) ||
    DETAIL_LABELS.includes(upper) ||
    COLOURS.some((c) => token.startsWith(c.bn) || c.aliases.some((a) => a.toUpperCase() === upper))
  );
};

/*
 * A short Latin value must match as a whole word: "L" is a substring of
 * "XL". Every size and Latin alias is one alphanumeric word, so the
 * segment is split once into its upper-cased Latin words and each lookup
 * is a Set hit. That is the same whole-word match as a per-value regex,
 * at a fraction of the cost on the 200-item hot path (NFR6.7.1).
 */
const latinWords = (ascii: string): ReadonlySet<string> =>
  new Set(
    ascii
      .toUpperCase()
      .split(/[^A-Z0-9]+/)
      .filter((w) => w.length > 0),
  );

/* A count followed by a counter word. `টা(?!কা)` keeps a price such as
   "৩২০ টাকা" from being read as a quantity of 320. */
const QUANTITY = /(\d+)\s*(?:টা(?!কা)|টি|পিস|pcs?\b|pieces?\b)/gi;

/** Split a message into item-sized segments at line breaks, punctuation and connectors. */
export const splitSegments = (text: string): string[] => {
  const segments: string[] = [];
  for (const piece of text.split(HARD_BREAK)) {
    let current: string[] = [];
    for (const token of piece.split(/\s+/).filter((t) => t.length > 0)) {
      if (CONNECTORS.includes(token.toLowerCase())) {
        if (current.length > 0) segments.push(current.join(" "));
        current = [];
      } else {
        current.push(token);
      }
    }
    if (current.length > 0) segments.push(current.join(" "));
  }
  return segments;
};

const single = <T>(hits: ReadonlyArray<T>): { value: T | null; ambiguous: boolean } => {
  const distinct = [...new Set(hits)];
  if (distinct.length === 1) return { value: distinct[0] ?? null, ambiguous: false };
  return { value: null, ambiguous: distinct.length > 1 };
};

/** Read one segment's own details. Nothing outside `segment` is consulted. */
export const readSegment = (
  segment: string,
  catalog: ReadonlyArray<CatalogEntry>,
): SegmentDetails => {
  const ascii = toAsciiDigits(segment);
  const words = latinWords(ascii);
  const quantities = [...ascii.matchAll(QUANTITY)].map((m) => Number(m[1]));
  const size = single(SIZES.filter((s) => words.has(s)));
  const colour = single(
    COLOURS.filter(
      (c) => segment.includes(c.bn) || c.aliases.some((a) => words.has(a.toUpperCase())),
    ).map((c) => c.bn),
  );
  // BR5.2: several matching products leave the item unlinked and ambiguous, never the first.
  const product = single(matchProducts(segment, ascii, catalog));
  const qty = single(quantities);
  const isItem = quantities.length > 0 || product.value !== null || product.ambiguous;
  const quantity = quantities.length === 0 ? 1 : (qty.value ?? 0);
  return {
    text: segment,
    isItem,
    quantity,
    size: size.value,
    colour: colour.value,
    productId: product.value,
    ambiguous: size.ambiguous || colour.ambiguous || product.ambiguous || qty.ambiguous,
    detailOnly: segment.split(/\s+/).every((t) => t.length === 0 || isDetailWord(t)),
  };
};
