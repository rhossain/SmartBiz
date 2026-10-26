/**
 * src/orders/parse-message.ts — parseMessage, the paste-parse engine
 * (US1.10, FR5.2, NFR6.7.1–NFR6.7.4).
 *
 * Contract:
 * - Pure: no I/O, no clock, no globals. The same text always gives the
 *   same result, which is what lets the tests restate the rule inline.
 * - Never throws. Every failure is a typed `ParseResult` reason: `empty`
 *   (nothing but whitespace), `malformed` (not a string, or no item could
 *   be found), `too_large` (more than 200 items, or a message too long to
 *   be an order). The 200-item cap is checked while items are being
 *   found, so an oversized paste stops early and never reaches the zod
 *   validators (plan decision 4).
 * - Items come from segments (parse-message-segments.ts): each item
 *   reads only its own words. Contact details are message-level and are
 *   read from whole lines.
 *
 * The phone number anchors the contact: it is the one field whose shape
 * cannot be mistaken (11 digits starting 01, optionally after +88). The
 * name is an explicit "নাম:" / "name:" label or the short line just above
 * the phone; the address is the line below it when it names a place, or
 * else the longest line naming two places. Anything not found is null,
 * never guessed. The lines used for contact are removed before item
 * segmentation, so an address can never become an item.
 */
import { toAsciiDigits } from "../i18n/bnDigits.js";
import { readSegment, splitSegments, type CatalogEntry } from "./parse-message-segments.js";
import type { OrderContact, ParsedItem, ParseResult } from "./types.js";

export const MAX_PARSE_ITEMS = 200;
export const MAX_PARSE_CHARS = 40_000;

const PLACE_WORDS: ReadonlyArray<string> = [
  "ঢাকা", "উত্তরা", "মিরপুর", "ধানমন্ডি", "গুলশান", "চট্টগ্রাম", "সিলেট", "রাজশাহী",
  "খুলনা", "নারায়ণগঞ্জ", "রোড", "সেক্টর", "হাউস", "বাড়ি", "ফ্ল্যাট", "বাসা",
];

const COD = /ক্যাশ অন|ক্যাশ|\bcod\b|cash on delivery/i;
const NAME_LABEL = /^(?:নাম|name)\s*[:：]\s*(.+)$/i;

const placeHits = (line: string): number => PLACE_WORDS.filter((p) => line.includes(p)).length;

interface ContactScan {
  readonly contact: OrderContact;
  readonly usedLines: ReadonlySet<number>;
}

const findPhone = (lines: ReadonlyArray<string>): { phone: string | null; index: number } => {
  for (const [index, line] of lines.entries()) {
    const m = toAsciiDigits(line).replace(/[\s\-+]/g, "").match(/(01\d{9})/);
    if (m && m[1]) return { phone: m[1], index };
  }
  return { phone: null, index: -1 };
};

const scanContact = (lines: ReadonlyArray<string>): ContactScan => {
  const used = new Set<number>();
  const { phone, index: phoneIdx } = findPhone(lines);
  if (phoneIdx >= 0) used.add(phoneIdx);

  let name: string | null = null;
  const labelled = lines.findIndex((l) => NAME_LABEL.test(l));
  if (labelled >= 0) {
    name = lines[labelled]?.match(NAME_LABEL)?.[1]?.trim() ?? null;
    used.add(labelled);
  } else if (phoneIdx > 0) {
    const above = lines[phoneIdx - 1] ?? "";
    const looksLikeItem = readSegment(above, []).isItem;
    if (above.length < 40 && !/\d{4,}/.test(toAsciiDigits(above)) && !looksLikeItem && placeHits(above) === 0) {
      name = above;
      used.add(phoneIdx - 1);
    }
  }

  let address: string | null = null;
  const below = phoneIdx >= 0 ? lines[phoneIdx + 1] : undefined;
  if (below !== undefined && placeHits(below) > 0) {
    address = below;
    used.add(phoneIdx + 1);
  } else {
    let best = -1;
    for (const [i, line] of lines.entries()) {
      if (placeHits(line) >= 2 && (best < 0 || line.length > (lines[best]?.length ?? 0))) best = i;
    }
    if (best >= 0) {
      address = lines[best] ?? null;
      used.add(best);
    }
  }
  return { contact: { name, phone, address }, usedLines: used };
};

const toParsedItem = (
  lineNo: number,
  details: ReturnType<typeof readSegment>,
  catalog: ReadonlyArray<CatalogEntry>,
): ParsedItem => ({
  lineNo,
  text: details.text,
  productId: details.productId,
  quantity: details.quantity,
  size: details.size,
  colour: details.colour,
  incomplete: details.ambiguous || details.quantity < 1 || (catalog.length > 0 && details.productId === null),
});

/**
 * Re-read one item after the person edits its words on the paste screen
 * (AC1.10.3). Only the edited text is read, so the segment rule holds
 * for edits exactly as it does for the original parse.
 */
export const reparseItem = (lineNo: number, text: string, catalog: ReadonlyArray<CatalogEntry> = []): ParsedItem =>
  toParsedItem(lineNo, readSegment(text.trim(), catalog), catalog);

/** Parse a pasted Messenger/WhatsApp order. Optional `catalog` resolves product ids. */
export const parseMessage = (text: unknown, catalog: ReadonlyArray<CatalogEntry> = []): ParseResult => {
  if (typeof text !== "string") return { ok: false, reason: "malformed" };
  if (text.trim() === "") return { ok: false, reason: "empty" };
  if (text.length > MAX_PARSE_CHARS) return { ok: false, reason: "too_large" };

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  const { contact, usedLines } = scanContact(lines);
  const itemText = lines.filter((_, i) => !usedLines.has(i)).join("\n");

  const items: ParsedItem[] = [];
  for (const segment of splitSegments(itemText)) {
    const details = readSegment(segment, catalog);
    if (!details.isItem) continue;
    if (items.length === MAX_PARSE_ITEMS) return { ok: false, reason: "too_large" };
    items.push(toParsedItem(items.length + 1, details, catalog));
  }
  if (items.length === 0) return { ok: false, reason: "malformed" };
  return { ok: true, items, contact, cashOnDelivery: COD.test(text) };
};
