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
 */
import { toAsciiDigits } from "../i18n/bnDigits.js";

export const CONNECTORS: ReadonlyArray<string> = ["আর", "এবং", "তারপর", "এ", "ও", "ওর", "আরো", "and"];

const HARD_BREAK = /\r?\n|[,;+·।]/;

export const SIZES: ReadonlyArray<string> = ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "2XL", "3XL"];

/** Canonical Bangla colour name plus the spellings customers use. */
export const COLOURS: ReadonlyArray<{ readonly bn: string; readonly aliases: ReadonlyArray<string> }> = [
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

/** A product the parser can recognise, by any of its words (B3 supplies the catalog). */
export interface CatalogEntry {
  readonly productId: string;
  readonly words: ReadonlyArray<string>;
}

export interface SegmentDetails {
  readonly text: string;
  readonly isItem: boolean;
  readonly quantity: number;
  readonly size: string | null;
  readonly colour: string | null;
  readonly productId: string | null;
  readonly ambiguous: boolean;
}

const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** A short Latin value must match as a word: "L" is a substring of "XL". */
const latinWord = (value: string): RegExp =>
  new RegExp(`(^|[^A-Za-z0-9])${escapeRe(value)}($|[^A-Za-z0-9])`, "i");

const SIZE_PATTERNS = SIZES.map((s) => ({ value: s, re: latinWord(s) }));
const COLOUR_PATTERNS = COLOURS.map((c) => ({ value: c.bn, latin: c.aliases.map(latinWord) }));
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

const mentions = (scope: string, word: string): boolean =>
  /^[\x20-\x7E]+$/.test(word) ? latinWord(word).test(scope) : scope.includes(word);

const single = <T>(hits: ReadonlyArray<T>): { value: T | null; ambiguous: boolean } => {
  const distinct = [...new Set(hits)];
  if (distinct.length === 1) return { value: distinct[0] ?? null, ambiguous: false };
  return { value: null, ambiguous: distinct.length > 1 };
};

/** Read one segment's own details. Nothing outside `segment` is consulted. */
export const readSegment = (segment: string, catalog: ReadonlyArray<CatalogEntry>): SegmentDetails => {
  const ascii = toAsciiDigits(segment);
  const quantities = [...ascii.matchAll(QUANTITY)].map((m) => Number(m[1]));
  const size = single(SIZE_PATTERNS.filter((p) => p.re.test(ascii)).map((p) => p.value));
  const colour = single(
    COLOUR_PATTERNS.filter((c) => segment.includes(c.value) || c.latin.some((re) => re.test(ascii))).map((c) => c.value),
  );
  const product = single(
    catalog.filter((p) => p.words.some((w) => w.length > 2 && mentions(segment, w))).map((p) => p.productId),
  );
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
  };
};
