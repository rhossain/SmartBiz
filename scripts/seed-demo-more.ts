/**
 * scripts/seed-demo-more.ts — `bun run seed:demo:more`: turn an existing demo business into
 * about three months of realistic trading, so every screen has something to show in a demo.
 *
 * Phase 1, through the app's own HTTP API (every record gets its audit row and passes the
 * same role gate, validation and status rules a person would): two more suppliers, six more
 * products with photos, sixteen more customers with notes, and ~65 orders LINKED to real
 * customers and variants (so Insights, best sellers, repeat buyers and customer histories
 * fill), moved through every status with courier references. The original demo orders that
 * are still open are moved on (settled, or one cancelled), because they become old.
 *
 * Phase 2, as the database admin (MIGRATE_DATABASE_URL from .env.migrate), demo data only:
 * timestamps are spread over the last ~95 days — business and staff first, then the catalog,
 * the customers, and the orders in order-number order — with a handful of orders today for the
 * daily card. Each record's audit rows move with it, keeping their order and their 5-year
 * retention span. Sign-in rows, stock settings and the pending invitation keep their real time.
 *
 * Preconditions: the app answers on 127.0.0.1:PORT, the demo business exists and `.env.demo`
 * holds its accounts. Not re-runnable: it stops if it finds its own marker supplier.
 *
 * Usage: `bun run start`, then `bun run seed:demo:more`.
 */
import { deflateSync } from "node:zlib";
import postgres from "postgres";
import { Client, loadAccounts, type JsonObject } from "./seed-demo.js";

const PORT = process.env["PORT"] ?? "3000";
const BASE = `http://127.0.0.1:${PORT}`;
const MARKER_SUPPLIER = "Sylhet Handloom Co-op";
const DAY = 86_400_000;
const HOUR = 3_600_000;
const MIN = 60_000;

/* ---------- deterministic randomness, so a rerun on a fresh copy gives the same demo ---------- */
let seed = 20261109;
const rnd = (): number => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const int = (lo: number, hi: number): number => lo + Math.floor(rnd() * (hi - lo + 1));
const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rnd() * xs.length)] as T;
const weighted = <T>(xs: ReadonlyArray<readonly [T, number]>): T => {
  const total = xs.reduce((s, [, w]) => s + w, 0);
  let r = rnd() * total;
  for (const [x, w] of xs) {
    r -= w;
    if (r <= 0) return x;
  }
  return xs[xs.length - 1]![0];
};
const paise = (taka: number): number => Math.round(taka * 100);

/* ---------- a placeholder product photo in the existing style: gradient plus a circle ---------- */
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf: Uint8Array): number => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type: string, data: Uint8Array): Buffer => {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  Buffer.from(data).copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
};
const photoPng = (light: [number, number, number], dark: [number, number, number]): string => {
  const size = 400;
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y += 1) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x += 1) {
      const inCircle = (x - 200) ** 2 + (y - 200) ** 2 < 112 ** 2;
      const t = (x + y) / (2 * size);
      const o = y * (size * 3 + 1) + 1 + x * 3;
      for (let ch = 0; ch < 3; ch += 1) {
        raw[o + ch] = inCircle ? dark[ch]! : Math.round(light[ch]! + (255 - light[ch]!) * t * 0.6);
      }
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr.set([8, 2, 0, 0, 0], 8);
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", new Uint8Array()),
  ]);
  return png.toString("base64");
};

/* ---------- the extra catalog ---------- */
const MORE_SUPPLIERS = [
  { name: MARKER_SUPPLIER, phone: "01715000555" },
  { name: "নারায়ণগঞ্জ নিটওয়্যার", phone: "01816000666" },
] as const;

interface MoreProduct {
  readonly name: string;
  readonly sku: string;
  readonly category: string;
  readonly price: number;
  readonly cost: number;
  readonly supplier: number; // index into MORE_SUPPLIERS
  readonly axes: ReadonlyArray<{ readonly name: string; readonly values: readonly string[] }>;
  readonly minimum: number;
  readonly colours: readonly [[number, number, number], [number, number, number]];
}

const MORE_PRODUCTS: readonly MoreProduct[] = [
  {
    name: "এমব্রয়ডারি কুর্তি",
    sku: "KURTI-EMB",
    category: "পোশাক",
    price: 1350,
    cost: 820,
    supplier: 0,
    axes: [
      { name: "সাইজ", values: ["S", "M", "L", "XL"] },
      { name: "রং", values: ["মেরুন", "কালো"] },
    ],
    minimum: 3,
    colours: [
      [214, 120, 140],
      [128, 30, 52],
    ],
  },
  {
    name: "Lawn salwar kameez",
    sku: "SK-LAWN",
    category: "Clothing",
    price: 2200,
    cost: 1450,
    supplier: 0,
    axes: [
      { name: "Size", values: ["M", "L", "XL"] },
      { name: "Colour", values: ["Pink", "Yellow"] },
    ],
    minimum: 2,
    colours: [
      [240, 190, 200],
      [200, 90, 120],
    ],
  },
  {
    name: "বাচ্চাদের ফ্রক",
    sku: "FROCK-KID",
    category: "শিশু",
    price: 650,
    cost: 380,
    supplier: 1,
    axes: [{ name: "বয়স", values: ["২ বছর", "৪ বছর", "৬ বছর"] }],
    minimum: 4,
    colours: [
      [250, 210, 120],
      [220, 140, 40],
    ],
  },
  {
    name: "Linen shirt",
    sku: "SHIRT-LIN",
    category: "Clothing",
    price: 1250,
    cost: 760,
    supplier: 1,
    axes: [
      { name: "Size", values: ["M", "L", "XL"] },
      { name: "Colour", values: ["White", "Sky"] },
    ],
    minimum: 3,
    colours: [
      [170, 200, 235],
      [60, 100, 160],
    ],
  },
  {
    name: "নকশি কাঁথা শাড়ি",
    sku: "SAREE-KANTHA",
    category: "শাড়ি",
    price: 3600,
    cost: 2500,
    supplier: 0,
    axes: [],
    minimum: 2,
    colours: [
      [200, 220, 170],
      [90, 120, 60],
    ],
  },
  {
    name: "Leather wallet",
    sku: "WALLET-LTH",
    category: "Accessories",
    price: 950,
    cost: 540,
    supplier: 1,
    axes: [{ name: "Colour", values: ["Brown", "Black"] }],
    minimum: 5,
    colours: [
      [205, 170, 140],
      [110, 70, 40],
    ],
  },
];

const MORE_CUSTOMERS: ReadonlyArray<{
  readonly name: string;
  readonly phone: string;
  readonly address: string;
  readonly riskLevel: number;
  readonly note: string | null;
  readonly weight: number; // how often they order
}> = [
  {
    name: "ফারজানা ইয়াসমিন",
    phone: "01713456789",
    address: "বসুন্ধরা আ/এ, ঢাকা",
    riskLevel: 0,
    note: "প্রতি মাসে অর্ডার করেন; নতুন কালেকশন এলে জানাবেন",
    weight: 6,
  },
  {
    name: "Tasnim Rahman",
    phone: "01815678901",
    address: "House 14, Road 3, Banani, Dhaka",
    riskLevel: 0,
    note: "Pays by bKash before delivery",
    weight: 5,
  },
  {
    name: "শাহানা পারভীন",
    phone: "01917890123",
    address: "নাসিরাবাদ, চট্টগ্রাম",
    riskLevel: 0,
    note: null,
    weight: 3,
  },
  {
    name: "Mahmudul Hasan",
    phone: "01619012345",
    address: "Kazir Dewri, Chattogram",
    riskLevel: 1,
    note: "Call before sending; office hours only",
    weight: 2,
  },
  {
    name: "নাজনীন আক্তার",
    phone: "01721234590",
    address: "মিরপুর ২, ঢাকা",
    riskLevel: 0,
    note: "বড় মেয়ের জন্য সাইজ L",
    weight: 4,
  },
  {
    name: "Ayesha Siddiqua",
    phone: "01823456712",
    address: "Ambarkhana, Sylhet",
    riskLevel: 0,
    note: null,
    weight: 2,
  },
  {
    name: "মো. রফিকুল ইসলাম",
    phone: "01925678934",
    address: "রাজশাহী সদর",
    riskLevel: 2,
    note: "একবার পার্সেল নেননি; অগ্রিম ডেলিভারি চার্জ নিন",
    weight: 2,
  },
  {
    name: "Sumaiya Khatun",
    phone: "01627890156",
    address: "Sonadanga, Khulna",
    riskLevel: 0,
    note: null,
    weight: 2,
  },
  {
    name: "তাহমিনা চৌধুরী",
    phone: "01729012378",
    address: "ধানমন্ডি ১৫, ঢাকা",
    riskLevel: 0,
    note: "শাড়ি পছন্দ করেন; ঈদের আগে মনে করিয়ে দিন",
    weight: 4,
  },
  {
    name: "Imran Kabir",
    phone: "01831234501",
    address: "Gazipur Chowrasta",
    riskLevel: 1,
    note: null,
    weight: 1,
  },
  {
    name: "রুবিনা ইয়াসমিন",
    phone: "01933456723",
    address: "নারায়ণগঞ্জ সদর",
    riskLevel: 0,
    note: null,
    weight: 2,
  },
  {
    name: "Nadia Islam",
    phone: "01635678945",
    address: "Uttara Sector 11, Dhaka",
    riskLevel: 0,
    note: "Gift orders; include a card",
    weight: 3,
  },
  {
    name: "মো. সাইফুল আলম",
    phone: "01737890167",
    address: "কুমিল্লা সদর",
    riskLevel: 3,
    note: "দুটি পার্সেল ফেরত, বাকি ৮৫০ টাকা; শুধু অগ্রিমে পাঠাবেন",
    weight: 1,
  },
  {
    name: "Priyanka Saha",
    phone: "01839012389",
    address: "Mohammadpur, Dhaka",
    riskLevel: 0,
    note: null,
    weight: 2,
  },
  {
    name: "জান্নাতুল ফেরদৌস",
    phone: "01941234512",
    address: "বগুড়া সদর",
    riskLevel: 0,
    note: null,
    weight: 1,
  },
  {
    name: "Ruhul Amin",
    phone: "01643456734",
    address: "Barishal Sadar",
    riskLevel: 1,
    note: null,
    weight: 1,
  },
];

/** Original demo customers, by name, and how often they reorder. */
const ORIGINAL_WEIGHTS: Readonly<Record<string, number>> = {
  "রিনা আক্তার": 6,
  "Karim Hossain": 4,
  "সাবরিনা ইসলাম": 2,
  "Nusrat Jahan": 3,
  "মো. হাসান": 1,
  "রুমা আক্তার": 1,
};

/** How popular each product is, by SKU (best sellers rank by units). */
const POPULARITY: Readonly<Record<string, number>> = {
  "KURTI-COT": 10,
  "PANJABI-COT": 8,
  "3PC-LAWN": 7,
  "KURTI-EMB": 6,
  "HIJAB-GEO": 6,
  "SK-LAWN": 5,
  "SHIRT-LIN": 4,
  "FROCK-KID": 4,
  "SAREE-JAM": 3,
  "SANDAL-LTH": 3,
  "WALLET-LTH": 2,
  "SAREE-KANTHA": 2,
};

const EXTRAS = [
  { description: "গিফট র‍্যাপ", price: 50 },
  { description: "Matching dupatta", price: 350 },
  { description: "অলটারেশন চার্জ", price: 100 },
] as const;

const COURIERS = ["SF", "PT", "RX"] as const;

const PATHS: Readonly<Record<string, readonly string[]>> = {
  new: [],
  confirmed: ["confirmed"],
  packed: ["confirmed", "packed"],
  shipped: ["confirmed", "packed", "shipped"],
  delivered: ["confirmed", "packed", "shipped", "delivered"],
  settled: ["confirmed", "packed", "shipped", "delivered", "settled"],
  partial: ["confirmed", "packed", "shipped", "partial"],
  returned: ["confirmed", "packed", "shipped", "returned"],
  cancelled: ["confirmed", "cancelled"],
};
const FORWARD = ["new", "confirmed", "packed", "shipped", "delivered", "settled"];

/** The final status an order of this age most likely has. */
const statusForAge = (ageDays: number): string => {
  if (ageDays >= 10)
    return weighted([
      ["settled", 72],
      ["delivered", 8],
      ["returned", 8],
      ["cancelled", 6],
      ["partial", 6],
    ]);
  if (ageDays >= 4)
    return weighted([
      ["settled", 35],
      ["delivered", 30],
      ["shipped", 20],
      ["partial", 5],
      ["returned", 5],
      ["cancelled", 5],
    ]);
  return weighted([
    ["shipped", 35],
    ["packed", 25],
    ["confirmed", 25],
    ["delivered", 10],
    ["cancelled", 5],
  ]);
};

interface MatchProduct {
  readonly productId: string;
  readonly name: string;
  readonly sku: string;
  readonly axisNames: readonly string[];
  readonly variants: ReadonlyArray<{
    readonly variantId: string;
    readonly axisValues: readonly string[];
  }>;
}
interface Customer {
  readonly id: string;
  readonly name: string;
  readonly phone: string;
  readonly address: string | null;
  readonly weight: number;
}
interface Planned {
  readonly id: string;
  readonly at: number; // target creation time, ms
  readonly today: boolean;
}

const fail = (msg: string): never => {
  throw new Error(msg);
};

const main = async (): Promise<void> => {
  const adminUrl =
    process.env["MIGRATE_DATABASE_URL"] ?? fail("MIGRATE_DATABASE_URL is not set (.env.migrate)");
  const health = await fetch(`${BASE}/api/health`).catch(() => null);
  if (!health || health.status !== 200)
    fail(`the app is not answering on ${BASE}; run \`bun run start\``);

  const accounts = loadAccounts(false);
  const sign = async (role: string): Promise<Client> => {
    const a = accounts.find((x) => x.role === role) ?? fail(`no ${role} account`);
    const c = new Client();
    await c.must("POST", "/api/auth/sign-in", { email: a.email, password: a.password });
    return c;
  };
  const owner = await sign("owner");
  const manager = await sign("manager");
  const sales = await sign("sales_staff");
  const accountant = await sign("accountant");
  const byRole: Readonly<Record<string, Client>> = { owner, manager, sales_staff: sales };

  const suppliersNow = (await manager.must("GET", "/api/suppliers"))["suppliers"] as Array<{
    name: string;
  }>;
  if (suppliersNow.some((s) => s.name === MARKER_SUPPLIER))
    fail("the extra demo data is already here");

  // ---- the original orders, captured before anything new is created ----
  const listAll = async (): Promise<Array<{ id: string; status: string; orderNo: string }>> => {
    const out: Array<{ id: string; status: string; orderNo: string }> = [];
    let cursor: string | null = null;
    do {
      const q: string = cursor ? `?limit=50&cursor=${encodeURIComponent(cursor)}` : "?limit=50";
      const page = await owner.must("GET", `/api/orders${q}`);
      for (const o of (page["orders"] as JsonObject[] | undefined) ?? []) {
        out.push({
          id: String(o["id"]),
          status: String(o["status"]),
          orderNo: String(o["orderNo"] ?? ""),
        });
      }
      cursor = (page["nextCursor"] as string | null | undefined) ?? null;
    } while (cursor);
    return out;
  };
  const originals = await listAll();

  const move = async (id: string, to: string, consignment?: string): Promise<void> => {
    const actor = to === "settled" ? accountant : manager;
    let t = await actor.call("POST", `/api/orders/${id}/status`, { to });
    if (t.status === 403) t = await owner.call("POST", `/api/orders/${id}/status`, { to });
    if (t.status >= 300)
      fail(`move ${id} to ${to} → ${t.status} ${JSON.stringify(t.json).slice(0, 200)}`);
    if (to === "packed" && consignment) {
      await owner.must("POST", `/api/orders/${id}/consignment`, { consignmentRef: consignment });
    }
  };
  let ref = 11000;
  const consignmentRef = (): string => {
    ref += int(3, 40);
    const courier = pick(COURIERS);
    // The app's formats: PT-#### (4 digits), SF-##### and RX-##### (5 digits).
    return courier === "PT" ? `PT-${5000 + (ref % 5000)}` : `${courier}-${ref}`;
  };

  // Original open orders become ~85 days old: move them on.
  let firstNew = true;
  for (const o of originals) {
    const at = FORWARD.indexOf(o.status);
    if (at < 0 || o.status === "settled") continue;
    if (o.status === "new" && firstNew) {
      firstNew = false;
      await move(o.id, "cancelled");
      continue;
    }
    for (const to of FORWARD.slice(at + 1))
      await move(o.id, to, to === "packed" ? consignmentRef() : undefined);
  }

  // ---- suppliers, products, photos ----
  const supplierIds: string[] = [];
  for (const s of MORE_SUPPLIERS) {
    const made = await manager.must("POST", "/api/suppliers", s);
    supplierIds.push(String((made["supplier"] as JsonObject)["id"]));
  }
  for (const p of MORE_PRODUCTS) {
    const combos = p.axes.reduce<string[][]>(
      (acc, a) => acc.flatMap((c) => a.values.map((v) => [...c, v])),
      [[]],
    );
    const made = await manager.must("POST", "/api/products", {
      name: p.name,
      sku: p.sku,
      category: p.category,
      sellingPricePaise: paise(p.price),
      defaultSupplierId: supplierIds[p.supplier] ?? null,
      axes: p.axes,
      variants: combos.map((axisValues) => ({ axisValues, stock: 500, minimumStock: p.minimum })),
    });
    const id = String((made["product"] as JsonObject)["id"]);
    await accountant.must("PATCH", `/api/products/${id}/cost`, {
      purchaseCostPaise: paise(p.cost),
    });
    await manager.must("PATCH", `/api/products/${id}/photo`, {
      photo: { contentType: "image/png", data: photoPng(p.colours[0], p.colours[1]) },
    });
  }

  // Every variant gets plenty of stock while orders are packed; real levels are set afterwards.
  const index = (await sales.must("GET", "/api/catalog/match-index"))["products"] as MatchProduct[];
  for (const p of index)
    for (const v of p.variants)
      await manager.must("PATCH", `/api/variants/${v.variantId}/stock`, { stock: 500 });
  const prices = new Map<string, number>();
  for (const p of index) {
    const detail = await manager.must("GET", `/api/products/${p.productId}`);
    const prod = (detail["product"] as JsonObject | undefined) ?? detail;
    prices.set(p.productId, Number(prod["sellingPricePaise"] ?? 0));
  }

  // ---- customers ----
  for (const c of MORE_CUSTOMERS) {
    const made = await sales.must("POST", "/api/customers", {
      name: c.name,
      phone: c.phone,
      address: c.address,
      riskLevel: c.riskLevel,
      ...(c.note !== null ? { note: c.note } : {}),
    });
    if (c.riskLevel === 3) {
      const id = String((made["customer"] as JsonObject)["id"]);
      await sales.must("POST", `/api/customers/${id}/notes`, {
        text: "জুলাইয়ের বাকি ৮৫০ টাকা পরিশোধ করেছেন; তবু অগ্রিম নিন",
      });
    }
  }
  const listed = (await sales.must("GET", "/api/customers?limit=50"))["customers"] as JsonObject[];
  const weightOf = new Map<string, number>([
    ...Object.entries(ORIGINAL_WEIGHTS),
    ...MORE_CUSTOMERS.map((c) => [c.name, c.weight] as const),
  ]);
  const customers: Customer[] = listed.map((c) => ({
    id: String(c["id"]),
    name: String(c["name"]),
    phone: String(c["phone"]),
    address: (c["address"] as string | null | undefined) ?? null,
    weight: weightOf.get(String(c["name"])) ?? 1,
  }));
  if (customers.length < 20) fail(`expected at least 20 customers, found ${customers.length}`);

  // ---- orders, created oldest first so order numbers follow the dates ----
  const now = Date.now();
  const dhakaMidnight = Math.floor((now + 6 * HOUR) / DAY) * DAY - 6 * HOUR; // today 00:00 in Dhaka
  const slots: Array<{ at: number; today: boolean; final: string }> = [];
  for (let age = 78; age >= 1; age -= 1) {
    const perDay = weighted<number>(
      age > 40
        ? [
            [0, 5],
            [1, 4],
            [2, 1],
          ]
        : [
            [0, 3],
            [1, 5],
            [2, 3],
            [3, 1],
          ],
    );
    for (let k = 0; k < perDay; k += 1) {
      slots.push({
        at: dhakaMidnight - age * DAY + int(9 * 60, 22 * 60) * MIN,
        today: false,
        final: statusForAge(age),
      });
    }
  }
  const todayFinals = ["settled", "settled", "confirmed", "confirmed", "packed", "new", "new"];
  const latest = now - 15 * MIN;
  const earliest = Math.min(dhakaMidnight + 9 * HOUR, latest - 4 * HOUR);
  todayFinals.forEach((final, i) => {
    slots.push({
      at: earliest + ((latest - earliest) * (i + 0.5)) / todayFinals.length,
      today: true,
      final,
    });
  });
  slots.sort((a, b) => a.at - b.at);

  const lastOrderOf = new Map<string, string>();
  const firstOrderAt = new Map<string, number>();
  const planned: Planned[] = [];
  const productWeights = index.map((p) => [p, POPULARITY[p.sku] ?? 1] as const);
  const customerWeights = customers.map((c) => [c, c.weight] as const);

  for (const slot of slots) {
    const customer = weighted(customerWeights);
    const lineCount = weighted<number>([
      [1, 6],
      [2, 3],
      [3, 1],
    ]);
    const used = new Set<string>();
    const items: JsonObject[] = [];
    for (let i = 0; i < lineCount; i += 1) {
      const p = weighted(productWeights);
      const v = pick(p.variants);
      if (used.has(v.variantId)) continue;
      used.add(v.variantId);
      const label = v.axisValues.length > 0 ? `${p.name} (${v.axisValues.join(", ")})` : p.name;
      items.push({
        variantId: v.variantId,
        description: label,
        quantity: weighted<number>([
          [1, 7],
          [2, 25 / 10],
          [3, 1 / 2],
        ]),
        unitPricePaise: prices.get(p.productId) ?? 0,
        lineDiscountPaise: rnd() < 0.12 ? paise(pick([50, 100, 150])) : 0,
      });
    }
    if (rnd() < 0.1) {
      const e = pick(EXTRAS);
      items.push({
        variantId: null,
        description: e.description,
        quantity: 1,
        unitPricePaise: paise(e.price),
        lineDiscountPaise: 0,
      });
    }
    const previous = lastOrderOf.get(customer.id);
    const source =
      previous && rnd() < 0.3
        ? "repeat"
        : weighted([
            ["paste-parse", 45],
            ["manual", 40],
            ["quick-add", 15],
          ] as const);
    const inDhaka =
      (customer.address ?? "").includes("ঢাকা") || (customer.address ?? "").includes("Dhaka");
    const by = weighted([
      ["sales_staff", 60],
      ["manager", 25],
      ["owner", 15],
    ] as const);
    const body = {
      source,
      customerId: customer.id,
      contact: { name: customer.name, phone: customer.phone, address: customer.address },
      repeatOfOrderId: source === "repeat" ? (previous ?? null) : null,
      items,
      orderDiscountPaise: rnd() < 0.15 ? paise(pick([50, 100, 200])) : 0,
      deliveryChargePaise: paise(inDhaka ? 60 : 120),
    };
    let r = await byRole[by]!.call("POST", "/api/orders", body);
    if (r.status === 403) r = await owner.call("POST", "/api/orders", body);
    if (r.status >= 300) fail(`create order → ${r.status} ${JSON.stringify(r.json).slice(0, 300)}`);
    const id = String(((r.json["order"] as JsonObject | undefined) ?? r.json)["id"]);
    for (const to of PATHS[slot.final] ?? [])
      await move(id, to, to === "packed" ? consignmentRef() : undefined);
    lastOrderOf.set(customer.id, id);
    if (!firstOrderAt.has(customer.id)) firstOrderAt.set(customer.id, slot.at);
    planned.push({ id, at: slot.at, today: slot.today });
  }

  // ---- real stock levels: most comfortable, a few below their minimum for the low-stock list ----
  let low = 0;
  for (const p of index) {
    for (const v of p.variants) {
      const short = low < 7 && rnd() < 0.18;
      if (short) low += 1;
      await manager.must("PATCH", `/api/variants/${v.variantId}/stock`, {
        stock: short ? int(0, 2) : int(6, 28),
      });
    }
  }

  // ---- phase 2: backdate, as the admin, in one transaction ----
  const sql = postgres(adminUrl, { max: 1, onnotice: () => undefined });
  const base = dhakaMidnight - 95 * DAY + 10 * HOUR;
  const cap = now - 5 * MIN;
  await sql.begin(async (tx) => {
    /** Move one record's audit rows: the first to `anchor`, each next one `gap` later (capped). */
    const placeAudit = async (
      kind: string,
      subject: string,
      anchor: number,
      gap: () => number,
      skip: readonly string[] = [],
    ): Promise<number[]> => {
      const rows = await tx<{ id: string; action: string }[]>`
        select id, action from audit_log where subject_kind = ${kind} and subject_id = ${subject}
        order by occurred_at, id`;
      const keep = rows.filter((r) => !skip.includes(r.action));
      const times: number[] = [];
      let t = anchor;
      for (const [i, _r] of keep.entries()) {
        if (i > 0) t += gap();
        times.push(t);
      }
      const end = times[times.length - 1] ?? anchor;
      const scale = end > cap && end > anchor ? (cap - anchor) / (end - anchor) : 1;
      const placed = times.map((x) => Math.round(anchor + (x - anchor) * scale));
      for (const [i, r] of keep.entries()) {
        const at = new Date(placed[i]!);
        await tx`update audit_log set retention_until = retention_until + (${at}::timestamptz - occurred_at),
                 occurred_at = ${at} where id = ${r.id}`;
      }
      return placed;
    };
    const iso = (ms: number): Date => new Date(ms);

    // Business and Owner.
    const [biz] = await tx<
      { id: string; owner_user_id: string }[]
    >`select id, owner_user_id from businesses`;
    if (!biz) fail("no business");
    await tx`update businesses set created_at = ${iso(base)}, updated_at = ${iso(base + 2 * DAY)}`;
    await placeAudit("business", biz!.id, base + 2 * DAY, () => 10 * MIN);
    await tx`update users set created_at = ${iso(base)}, updated_at = ${iso(base)} where id = ${biz!.owner_user_id}`;
    await placeAudit("user", biz!.owner_user_id, base, () => 20 * MIN, [
      "auth.sign_in",
      "auth.sign_out",
      "auth.reset_link_created",
    ]);

    // Staff: invitations used on day 1, their accounts and accept rows.
    const invs = await tx<
      { id: string; email: string }[]
    >`select id, email from invitations where used_at is not null order by created_at`;
    for (const [i, inv] of invs.entries()) {
      const sent = base + DAY + i * HOUR;
      await tx`update invitations set created_at = ${iso(sent)}, used_at = ${iso(sent + 2 * HOUR)},
               expires_at = ${iso(sent + 7 * DAY)} where id = ${inv.id}`;
      await placeAudit("invitation", inv.id, sent, () => 10 * MIN);
      const [u] = await tx<
        { id: string }[]
      >`select id from users where lower(email) = lower(${inv.email})`;
      if (u) {
        await tx`update users set created_at = ${iso(sent + 2 * HOUR)}, updated_at = ${iso(sent + 2 * HOUR)} where id = ${u.id}`;
        await placeAudit("user", u.id, sent + 2 * HOUR, () => 10 * MIN, [
          "auth.sign_in",
          "auth.sign_out",
          "auth.reset_link_created",
        ]);
      }
    }

    // Catalog: suppliers and products in the first week; variant rows with their product.
    const sups = await tx<{ id: string }[]>`select id from suppliers order by created_at, id`;
    for (const [i, s] of sups.entries()) {
      const at = base + 2 * DAY + i * 25 * MIN;
      await tx`update suppliers set created_at = ${iso(at)}, updated_at = ${iso(at)} where id = ${s.id}`;
      await placeAudit("supplier", s.id, at, () => 10 * MIN);
    }
    const prods = await tx<{ id: string }[]>`select id from products order by created_at, id`;
    for (const [i, p] of prods.entries()) {
      const at = base + 3 * DAY + i * 40 * MIN;
      await tx`update products set created_at = ${iso(at)}, updated_at = ${iso(at + 30 * MIN)},
               photo_updated_at = case when photo_updated_at is null then null else ${iso(at + 20 * MIN)}::timestamptz end
               where id = ${p.id}`;
      await tx`update variants set created_at = ${iso(at)} where product_id = ${p.id}`;
      await placeAudit("product", p.id, at, () => 10 * MIN);
    }

    // Customers: shortly before their first order (or in the first week); notes after.
    const custs = await tx<{ id: string }[]>`select id from customers order by created_at, id`;
    for (const [i, c] of custs.entries()) {
      const first = firstOrderAt.get(c.id);
      const at =
        first !== undefined
          ? Math.max(base + 4 * DAY + i * HOUR, first - int(1, 4) * DAY)
          : base + 4 * DAY + i * HOUR;
      const anchor = Math.min(at, first !== undefined ? first - HOUR : at);
      await tx`update customers set created_at = ${iso(anchor)}, updated_at = ${iso(anchor)} where id = ${c.id}`;
      const placed = await placeAudit("customer", c.id, anchor, () => int(2, 9) * DAY);
      const notes = await tx<
        { id: string }[]
      >`select id from customer_notes where customer_id = ${c.id} order by created_at, id`;
      // The note rows follow the audit rows after "customer.create" (the first one).
      for (const [k, n] of notes.entries()) {
        const at2 = placed[k + 1] ?? placed[0] ?? anchor;
        await tx`update customer_notes set created_at = ${iso(at2)} where id = ${n.id}`;
      }
      if (placed.length > 0)
        await tx`update customers set updated_at = ${iso(placed[placed.length - 1]!)} where id = ${c.id}`;
    }

    // Orders: the originals ~90–80 days ago, the new ones on their planned dates.
    const all: Planned[] = [
      ...originals
        .slice()
        .sort((a, b) => a.orderNo.localeCompare(b.orderNo, undefined, { numeric: true }))
        .map((o, i) => ({
          id: o.id,
          at: base + 5 * DAY + i * 11 * HOUR + int(0, 120) * MIN,
          today: false,
        })),
      ...planned,
    ];
    for (const o of all) {
      const gap = o.today ? () => int(10, 45) * MIN : () => int(5, 30) * HOUR;
      const placed = await placeAudit("order", o.id, o.at, gap);
      const last = placed[placed.length - 1] ?? o.at;
      await tx`update orders set created_at = ${iso(o.at)}, updated_at = ${iso(last)} where id = ${o.id}`;
      // A consignment is linked when the order is packed: use the audit time of the link row.
      const [link] = await tx<{ occurred_at: Date }[]>`
        select occurred_at from audit_log where subject_kind = 'order' and subject_id = ${o.id}
        and action = 'order.consignment.link' order by occurred_at limit 1`;
      if (link)
        await tx`update consignment_link set linked_at = ${link.occurred_at} where order_id = ${o.id}`;
    }
  });
  await sql.end();

  // eslint-disable-next-line no-console -- CLI script: the one-line result is its output.
  console.log(
    `seed:demo:more ok — ${originals.length} original orders aged, ${planned.length} new linked orders ` +
      `(${planned.filter((p) => p.today).length} today), ${MORE_PRODUCTS.length} products, ` +
      `${MORE_CUSTOMERS.length} customers, ${MORE_SUPPLIERS.length} suppliers, ${low} variants below minimum.`,
  );
};

if (import.meta.main) {
  main().catch((e: unknown) => {
    console.error(`seed:demo:more failed: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  });
}
