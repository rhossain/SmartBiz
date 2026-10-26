/**
 * tests/unit/parseMessage-segments.test.ts — R2.2 (FR5.2, NFR6.5, NFR6.7.2, NFR6.7.3).
 *
 * The rule under test, restated here rather than imported (team.md §TP-8):
 *
 *     SEGMENT RULE: an item's details come from the item's own words.
 *
 * Concretely, for every parsed item: its size and colour must appear in
 * that item's own text, and a word that belongs to a neighbouring item
 * must never be attributed to it. The fixtures cover multiple products,
 * several variants of one product, Bangla and ASCII digits, and the
 * connectors আর, এবং, তারপর, এ, ও, ওর, আরো. The seeded fixture set must
 * parse at ≥ 95% (NFR6.7.3).
 */
import { describe, expect, test } from "bun:test";
import { parseMessage } from "../../src/orders/parse-message.js";
import { splitSegments } from "../../src/orders/parse-message-segments.js";
import type { ParsedItem } from "../../src/orders/types.js";

interface Expected {
  readonly qty: number;
  readonly size: string | null;
  readonly colour: string | null;
}

/** English spellings used in the fixtures, restated here (the parser stores the Bangla name). */
const ENGLISH: Readonly<Record<string, string>> = { কালো: "black", সাদা: "white", লাল: "red", নীল: "blue" };

/** The rule, restated: every detail on an item is found in that item's own words. */
const assertOwnWords = (item: ParsedItem): void => {
  if (item.size !== null) expect(new RegExp(`(^|[^A-Za-z0-9])${item.size}($|[^A-Za-z0-9])`, "i").test(item.text)).toBe(true);
  if (item.colour !== null) {
    const english = ENGLISH[item.colour];
    const own = item.text.includes(item.colour) || (english !== undefined && item.text.toLowerCase().includes(english));
    expect({ item: item.text, colour: item.colour, own }).toEqual({ item: item.text, colour: item.colour, own: true });
  }
};

const DEMO =
  "আপা এই কালো কুর্তিটা M সাইজ লাগবে ১টা\n" +
  "আর গোলাপি সিল্ক ওড়না ১টা দিয়েন\n" +
  "নাম: ফারজানা আক্তার\n" +
  "01711234567\n" +
  "হাউস ৩২, রোড ৭, সেক্টর ৪, উত্তরা, ঢাকা\n" +
  "ক্যাশ অন ডেলিভারি করে দিয়েন";

const FIXTURES: ReadonlyArray<{ readonly text: string; readonly items: ReadonlyArray<Expected> }> = [
  { text: DEMO, items: [{ qty: 1, size: "M", colour: "কালো" }, { qty: 1, size: null, colour: "গোলাপি" }] },
  { text: "লাল শাড়ি ২টা এবং নীল শাড়ি ১টা", items: [{ qty: 2, size: null, colour: "লাল" }, { qty: 1, size: null, colour: "নীল" }] },
  { text: "কালো টি-শার্ট L সাইজ ৩টা, সাদা টি-শার্ট XL সাইজ ২টা", items: [{ qty: 3, size: "L", colour: "কালো" }, { qty: 2, size: "XL", colour: "সাদা" }] },
  { text: "সবুজ কুর্তি M ১টা তারপর হলুদ কুর্তি S ২টা", items: [{ qty: 1, size: "M", colour: "সবুজ" }, { qty: 2, size: "S", colour: "হলুদ" }] },
  { text: "নীল জিন্স ২টা ও কালো বেল্ট ১টা", items: [{ qty: 2, size: null, colour: "নীল" }, { qty: 1, size: null, colour: "কালো" }] },
  { text: "মেরুন থ্রি-পিস ১টা আরো বেগুনি থ্রি-পিস ১টা", items: [{ qty: 1, size: null, colour: "মেরুন" }, { qty: 1, size: null, colour: "বেগুনি" }] },
  { text: "black hoodie M 2pcs and white hoodie L 1pcs", items: [{ qty: 2, size: "M", colour: "কালো" }, { qty: 1, size: "L", colour: "সাদা" }] },
  { text: "ধূসর প্যান্ট ৩২ সাইজ ২টা", items: [{ qty: 2, size: null, colour: "ধূসর" }] },
  { text: "লাল শাড়ি ১টা, দাম ১২০০ টাকা", items: [{ qty: 1, size: null, colour: "লাল" }] },
  { text: "কমলা স্কার্ফ ৫টি", items: [{ qty: 5, size: null, colour: "কমলা" }] },
  { text: "আকাশি পাঞ্জাবি XL ১টা ওর সাথে সাদা পায়জামা ১টা", items: [{ qty: 1, size: "XL", colour: "আকাশি" }, { qty: 1, size: null, colour: "সাদা" }] },
  { text: "খয়েরি ব্যাগ ১টা এ সাথে কালো ওয়ালেট ১টা", items: [{ qty: 1, size: null, colour: "খয়েরি" }, { qty: 1, size: null, colour: "কালো" }] },
  { text: "সাদা কুর্তি M ২টা + লাল ওড়না ১টা", items: [{ qty: 2, size: "M", colour: "সাদা" }, { qty: 1, size: null, colour: "লাল" }] },
  { text: "নীল শার্ট L ১টা। সবুজ শার্ট M ২টা।", items: [{ qty: 1, size: "L", colour: "নীল" }, { qty: 2, size: "M", colour: "সবুজ" }] },
  {
    text: "কুর্তি: কালো M ১টা, কালো L ১টা, সাদা M ২টা",
    items: [{ qty: 1, size: "M", colour: "কালো" }, { qty: 1, size: "L", colour: "কালো" }, { qty: 2, size: "M", colour: "সাদা" }],
  },
  { text: "লাল শাড়ি 2টা আর নীল শাড়ি ৩টা", items: [{ qty: 2, size: null, colour: "লাল" }, { qty: 3, size: null, colour: "নীল" }] },
  { text: "কালো হুডি XXL ১টা", items: [{ qty: 1, size: "XXL", colour: "কালো" }] },
  { text: "red scarf 4 pieces and blue scarf 2 pieces", items: [{ qty: 4, size: null, colour: "লাল" }, { qty: 2, size: null, colour: "নীল" }] },
  {
    text: "গোলাপি জামা S ১টা\nহলুদ জামা M ১টা\nসবুজ জামা L ১টা\nরহিম\n01812345678\nমিরপুর ১০, ঢাকা",
    items: [{ qty: 1, size: "S", colour: "গোলাপি" }, { qty: 1, size: "M", colour: "হলুদ" }, { qty: 1, size: "L", colour: "সবুজ" }],
  },
  { text: "বেগুনি শাল ২ পিস এবং ধূসর শাল ১ পিস", items: [{ qty: 2, size: null, colour: "বেগুনি" }, { qty: 1, size: null, colour: "ধূসর" }] },
];

const matches = (items: ReadonlyArray<ParsedItem>, expected: ReadonlyArray<Expected>): boolean =>
  items.length === expected.length &&
  items.every((it, i) => {
    const e = expected[i];
    return e !== undefined && it.quantity === e.qty && it.size === e.size && it.colour === e.colour && !it.incomplete;
  });

describe("R2.2 — segment isolation: an item's details come from the item's own words", () => {
  test("the prototype regression: the pink dupatta stays pink although কালো appears earlier", () => {
    const r = parseMessage(DEMO);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.items.length).toBe(2);
    expect(r.items[0]!.colour).toBe("কালো");
    expect(r.items[0]!.size).toBe("M");
    expect(r.items[1]!.colour).toBe("গোলাপি");
    expect(r.items[1]!.size).toBeNull(); // the kurti's M is not the dupatta's
    for (const item of r.items) assertOwnWords(item);
  });

  test("seeded fixtures parse at ≥ 95% and every item obeys the rule (NFR6.7.3)", () => {
    let passed = 0;
    const failures: string[] = [];
    for (const f of FIXTURES) {
      const r = parseMessage(f.text);
      if (r.ok && matches(r.items, f.items)) passed += 1;
      else failures.push(f.text);
      if (r.ok) for (const item of r.items) assertOwnWords(item);
    }
    expect(FIXTURES.length).toBeGreaterThanOrEqual(20);
    expect({ rate: passed / FIXTURES.length >= 0.95, failures }).toEqual({ rate: true, failures: [] });
  });

  test("several variants of one product each keep their own size and colour", () => {
    const r = parseMessage("কুর্তি: কালো M ১টা, কালো L ১টা, সাদা M ২টা");
    expect(r.ok && r.items.map((i) => `${i.colour}/${i.size}/${i.quantity}`)).toEqual(["কালো/M/1", "কালো/L/1", "সাদা/M/2"]);
  });

  test("every listed Bangla connector splits items; inside a word it does not", () => {
    for (const connector of ["আর", "এবং", "তারপর", "এ", "ও", "ওর", "আরো"]) {
      const r = parseMessage(`লাল শাড়ি ১টা ${connector} নীল শাড়ি ২টা`);
      expect(r.ok && r.items.map((i) => i.colour)).toEqual(["লাল", "নীল"]);
    }
    // "আরও" and "এই" contain connector letters but are other words.
    expect(splitSegments("এই লাল শাড়ি আরও ভালো ১টা")).toEqual(["এই লাল শাড়ি আরও ভালো ১টা"]);
  });

  test("two values from one item's own words are left unresolved, never guessed", () => {
    const twoColours = parseMessage("কালো সাদা কুর্তি M ১টা");
    expect(twoColours.ok && twoColours.items[0]).toMatchObject({ colour: null, size: "M", incomplete: true });
    const twoSizes = parseMessage("লাল কুর্তি M L ১টা");
    expect(twoSizes.ok && twoSizes.items[0]).toMatchObject({ colour: "লাল", size: null, incomplete: true });
    const twoCounts = parseMessage("২টা কুর্তি ৩টা");
    expect(twoCounts.ok && twoCounts.items[0]).toMatchObject({ quantity: 0, incomplete: true });
  });

  test("a catalog resolves the product from the segment's own words only", () => {
    const catalog = [
      { productId: "P-001", words: ["কুর্তি"] },
      { productId: "P-002", words: ["ওড়না"] },
    ];
    const r = parseMessage("কালো কুর্তি M ১টা আর গোলাপি ওড়না ১টা", catalog);
    expect(r.ok && r.items.map((i) => i.productId)).toEqual(["P-001", "P-002"]);
    const both = parseMessage("কুর্তি ওড়না সেট ১টা", catalog);
    expect(both.ok && both.items[0]).toMatchObject({ productId: null, incomplete: true });
    const unknown = parseMessage("লাল জুতা ১টা", catalog);
    expect(unknown.ok && unknown.items[0]).toMatchObject({ productId: null, incomplete: true });
  });

  test("contact is read from whole lines, and those lines never become items", () => {
    const r = parseMessage(DEMO);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.contact).toEqual({
      name: "ফারজানা আক্তার",
      phone: "01711234567",
      address: "হাউস ৩২, রোড ৭, সেক্টর ৪, উত্তরা, ঢাকা",
    });
    expect(r.cashOnDelivery).toBe(true);
    expect(r.items.some((i) => i.text.includes("উত্তরা") || i.text.includes("ফারজানা"))).toBe(false);
  });

  test("phone in Bangla digits or with +88 is found; the line above becomes the name", () => {
    const r = parseMessage("সাদা শার্ট M ১টা\nরহিম উদ্দিন\n+৮৮০১৮১২-৩৪৫৬৭৮\nমিরপুর ১০, ঢাকা");
    expect(r.ok && r.contact).toEqual({ name: "রহিম উদ্দিন", phone: "01812345678", address: "মিরপুর ১০, ঢাকা" });
    expect(r.ok && r.cashOnDelivery).toBe(false);
    const noPhone = parseMessage("লাল শাড়ি ১টা");
    expect(noPhone.ok && noPhone.contact).toEqual({ name: null, phone: null, address: null });
  });
});
