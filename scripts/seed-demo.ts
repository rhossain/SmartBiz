/**
 * scripts/seed-demo.ts — `bun run seed:demo`: fill a fresh local deployment with demo data
 * through the app's own HTTP API, so every record carries its audit rows and passes the same
 * role gate, validation and status rules a person typing it in would.
 *
 * What it creates: the Owner's business, three staff (manager, sales staff, accountant) who
 * accept their invitations, one invitation left pending, and 16 orders from several sources
 * moved through every order status (new, confirmed, packed, shipped, delivered, settled,
 * partial, cancelled, returned), with courier consignment references on the shipped ones.
 * U4 (Q16): and the demo catalog (`seedDemoCatalog` below): 4 suppliers, 6 products with sizes
 * and colours (some variants below their minimum, one product without a supplier, one cost
 * unrecorded) and 6 customers with risk levels and notes (one revised, two sharing a phone).
 *
 * Credentials: demo-only, generated on first run into `.env.demo` (gitignored by `.env.*`,
 * mode 600) and reused afterwards; they are never printed. Run it against an empty database
 * only: it stops when a business already exists, because the first sign-up is the Owner.
 *
 * Usage: start the app (`bun run start`), then `bun run seed:demo` (PORT defaults to 3000).
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const PORT = Number(process.env["PORT"] ?? "3000");
export const BASE = `http://127.0.0.1:${PORT}`;
const CRED_FILE = join(ROOT, ".env.demo");

export type Role = "owner" | "manager" | "sales_staff" | "accountant";
export interface Account {
  readonly role: Role;
  readonly email: string;
  readonly password: string;
}

const randomPassword = (): string => `Demo-${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;

/**
 * Load the demo accounts from `.env.demo`, creating the file on the first run — unless
 * `create` is false (seed:demo:catalog), which needs the accounts that already exist.
 */
export const loadAccounts = (create = true): Account[] => {
  const roles: Role[] = ["owner", "manager", "sales_staff", "accountant"];
  if (!existsSync(CRED_FILE)) {
    if (!create) throw new Error(".env.demo is missing; run `bun run seed:demo` first");
    const lines = [
      "# Demo sign-in accounts written by scripts/seed-demo.ts. Local demo data only.",
      ...roles.flatMap((r) => [
        `DEMO_${r.toUpperCase()}_EMAIL=${r.replace("_", "-")}@smartbiz.test`,
        `DEMO_${r.toUpperCase()}_PASSWORD=${randomPassword()}`,
      ]),
    ];
    writeFileSync(CRED_FILE, `${lines.join("\n")}\n`, { mode: 0o600 });
  }
  const env = new Map(
    readFileSync(CRED_FILE, "utf8")
      .split("\n")
      .filter((l) => l.includes("=") && !l.startsWith("#"))
      .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)] as const),
  );
  return roles.map((role) => {
    const email = env.get(`DEMO_${role.toUpperCase()}_EMAIL`);
    const password = env.get(`DEMO_${role.toUpperCase()}_PASSWORD`);
    if (!email || !password) throw new Error(`.env.demo is missing the ${role} account`);
    return { role, email, password };
  });
};

/** A parsed JSON response body; fields are narrowed where they are read. */
export type JsonObject = { readonly [key: string]: unknown };

/** One signed-in client: keeps its own session cookie. */
export class Client {
  private cookie = "";

  async call(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<{ status: number; json: JsonObject }> {
    const headers: Record<string, string> = { Origin: BASE };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (this.cookie) headers["Cookie"] = this.cookie;
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) this.cookie = setCookie.split(";")[0] ?? "";
    const text = await res.text();
    return { status: res.status, json: text ? (JSON.parse(text) as JsonObject) : {} };
  }

  async must(method: string, path: string, body?: unknown): Promise<JsonObject> {
    const r = await this.call(method, path, body);
    if (r.status >= 300) {
      throw new Error(`${method} ${path} → ${r.status} ${JSON.stringify(r.json).slice(0, 200)}`);
    }
    return r.json;
  }
}

interface Line {
  readonly description: string;
  readonly quantity: number;
  readonly price: number; // taka
  readonly discount?: number; // taka
}
interface DemoOrder {
  readonly by: Role;
  readonly source: "manual" | "paste-parse" | "repeat" | "quick-add";
  readonly name: string;
  readonly phone: string;
  readonly address: string | null;
  readonly lines: readonly Line[];
  readonly delivery: number; // taka
  readonly orderDiscount?: number; // taka
  /** The statuses to move through, in order, after creation. */
  readonly path: readonly string[];
  /** Courier reference linked once the order is packed. */
  readonly consignment?: string;
}

const paise = (taka: number): number => Math.round(taka * 100);

const ORDERS: readonly DemoOrder[] = [
  {
    by: "sales_staff",
    source: "paste-parse",
    name: "রিনা আক্তার",
    phone: "01711234567",
    address: "মিরপুর ১০, ঢাকা",
    lines: [
      { description: "সুতি কুর্তি (নীল, M)", quantity: 2, price: 850 },
      { description: "ওড়না", quantity: 1, price: 350 },
    ],
    delivery: 60,
    path: ["confirmed", "packed", "shipped", "delivered", "settled"],
    consignment: "SF-10231",
  },
  {
    by: "sales_staff",
    source: "manual",
    name: "Karim Hossain",
    phone: "01819876543",
    address: "Agrabad, Chattogram",
    lines: [{ description: "Jamdani saree", quantity: 1, price: 4800, discount: 300 }],
    delivery: 120,
    path: ["confirmed", "packed", "shipped", "delivered", "settled"],
    consignment: "PT-4410",
  },
  {
    by: "owner",
    source: "manual",
    name: "সাবরিনা ইসলাম",
    phone: "01922334455",
    address: "ধানমন্ডি ২৭, ঢাকা",
    lines: [
      { description: "থ্রি-পিস (লাল)", quantity: 1, price: 1850 },
      { description: "হিজাব", quantity: 2, price: 280 },
    ],
    delivery: 60,
    path: ["confirmed", "packed", "shipped", "delivered"],
    consignment: "RX-20877",
  },
  {
    by: "sales_staff",
    source: "quick-add",
    name: "Nusrat Jahan",
    phone: "01633445566",
    address: "Zindabazar, Sylhet",
    lines: [{ description: "Cotton panjabi (white, L)", quantity: 1, price: 1450 }],
    delivery: 120,
    path: ["confirmed", "packed", "shipped"],
    consignment: "SF-10244",
  },
  {
    by: "manager",
    source: "manual",
    name: "মো. হাসান",
    phone: "01744556677",
    address: "উত্তরা সেক্টর ৭, ঢাকা",
    lines: [{ description: "বাচ্চাদের ফ্রক", quantity: 3, price: 650 }],
    delivery: 60,
    orderDiscount: 100,
    path: ["confirmed", "packed", "shipped"],
    consignment: "PT-4415",
  },
  {
    by: "sales_staff",
    source: "paste-parse",
    name: "Farhana Akter",
    phone: "01855667788",
    address: "Shaheb Bazar, Rajshahi",
    lines: [
      { description: "Silk scarf", quantity: 2, price: 520 },
      { description: "Clutch bag", quantity: 1, price: 950 },
    ],
    delivery: 120,
    path: ["confirmed", "packed"],
    consignment: "RX-20891",
  },
  {
    by: "owner",
    source: "manual",
    name: "তানিয়া রহমান",
    phone: "01966778899",
    address: "বনানী, ঢাকা",
    lines: [{ description: "লিনেন শার্ট", quantity: 2, price: 1250 }],
    delivery: 60,
    path: ["confirmed", "packed"],
  },
  {
    by: "sales_staff",
    source: "quick-add",
    name: "Arif Chowdhury",
    phone: "01577889900",
    address: "Khulna Sadar",
    lines: [{ description: "Leather sandal (42)", quantity: 1, price: 1650 }],
    delivery: 120,
    path: ["confirmed"],
  },
  {
    by: "manager",
    source: "paste-parse",
    name: "শারমিন সুলতানা",
    phone: "01688990011",
    address: "মোহাম্মদপুর, ঢাকা",
    lines: [
      { description: "সালোয়ার কামিজ", quantity: 1, price: 2200 },
      { description: "কানের দুল", quantity: 1, price: 450 },
    ],
    delivery: 60,
    path: ["confirmed"],
  },
  {
    by: "sales_staff",
    source: "manual",
    name: "Rahim Uddin",
    phone: "01799001122",
    address: "Cumilla Sadar",
    lines: [{ description: "Lungi (checked)", quantity: 4, price: 380 }],
    delivery: 120,
    path: [],
  },
  {
    by: "sales_staff",
    source: "paste-parse",
    name: "মিতু দাস",
    phone: "01811002233",
    address: "গুলশান ২, ঢাকা",
    lines: [{ description: "কাঁথা স্টিচ শাড়ি", quantity: 1, price: 3600 }],
    delivery: 60,
    path: [],
  },
  {
    by: "owner",
    source: "repeat",
    name: "রিনা আক্তার",
    phone: "01711234567",
    address: "মিরপুর ১০, ঢাকা",
    lines: [{ description: "সুতি কুর্তি (সবুজ, M)", quantity: 1, price: 850 }],
    delivery: 60,
    path: [],
  },
  {
    by: "sales_staff",
    source: "manual",
    name: "Sadia Afrin",
    phone: "01922113344",
    address: "Mymensingh Sadar",
    lines: [
      { description: "Kids' panjabi set", quantity: 2, price: 990 },
      { description: "Tupi cap", quantity: 2, price: 120 },
    ],
    delivery: 120,
    path: ["confirmed", "packed", "shipped", "partial"],
    consignment: "SF-10260",
  },
  {
    by: "manager",
    source: "manual",
    name: "জাকির হোসেন",
    phone: "01733224455",
    address: "বরিশাল সদর",
    lines: [{ description: "ফতুয়া", quantity: 2, price: 720 }],
    delivery: 120,
    path: ["cancelled"],
  },
  {
    by: "sales_staff",
    source: "paste-parse",
    name: "Lamia Haque",
    phone: "01644335566",
    address: "Rangpur Sadar",
    lines: [{ description: "Embroidered kurti (S)", quantity: 1, price: 1350 }],
    delivery: 120,
    path: ["confirmed", "packed", "shipped", "returned"],
    consignment: "RX-20902",
  },
  {
    by: "owner",
    source: "manual",
    name: "নাসির আহমেদ",
    phone: "01555446677",
    address: "নারায়ণগঞ্জ",
    lines: [{ description: "পাঞ্জাবি (ঈদ কালেকশন)", quantity: 3, price: 2100, discount: 200 }],
    delivery: 60,
    orderDiscount: 300,
    path: ["confirmed", "packed", "shipped", "delivered", "settled"],
    consignment: "PT-4422",
  },
];

/*
 * U4 (functional-design Q16; infrastructure-design Q4, R-05): the demo catalog — suppliers,
 * products with sizes and colours (some below their minimum, one without a supplier), and
 * customers with notes and risk levels (one note revised, two customers sharing a phone) — so
 * every catalog screen has something to show. Written through the API as the role that
 * would do it: the Manager records suppliers, products and stock; Sales Staff the customers;
 * the Accountant a purchase cost. Shared with `bun run seed:demo:catalog`
 * (scripts/seed-demo-catalog.ts), which adds the catalog to an EXISTING demo business: a
 * product whose SKU is already taken (409) is skipped, and so is a supplier or customer that
 * is already there, so a second run adds nothing twice.
 */
interface DemoProduct {
  readonly name: string;
  readonly sku: string;
  readonly category: string | null;
  readonly price: number; // taka
  readonly cost: number | null; // taka
  readonly supplier: number | null; // index into DEMO_SUPPLIERS
  readonly axes: ReadonlyArray<{ readonly name: string; readonly values: readonly string[] }>;
  /** Stock and minimum per variant, in cross-product order (the same number for all if one). */
  readonly stock: readonly number[];
  readonly minimum: number;
}

export const DEMO_SUPPLIERS = [
  { name: "রহিম ট্রেডার্স", phone: "01711000111" },
  { name: "Dhaka Textile House", phone: "01812000222" },
  { name: "নিউমার্কেট হোলসেল", phone: "01913000333" },
  { name: "Chattogram Leather Co.", phone: "01614000444" },
] as const;

export const DEMO_PRODUCTS: readonly DemoProduct[] = [
  {
    name: "সুতি কুর্তি",
    sku: "KURTI-COT",
    category: "পোশাক",
    price: 850,
    cost: 520,
    supplier: 0,
    axes: [
      { name: "সাইজ", values: ["S", "M", "L"] },
      { name: "রং", values: ["নীল", "সবুজ"] },
    ],
    stock: [6, 1, 9, 4, 0, 7],
    minimum: 3,
  },
  {
    name: "Jamdani saree",
    sku: "SAREE-JAM",
    category: "Saree",
    price: 4800,
    cost: 3400,
    supplier: 1,
    axes: [{ name: "Colour", values: ["Red", "Teal", "Ivory"] }],
    stock: [2, 5, 1],
    minimum: 2,
  },
  {
    name: "থ্রি-পিস",
    sku: "3PC-LAWN",
    category: "পোশাক",
    price: 1850,
    cost: null,
    supplier: 2,
    axes: [{ name: "সাইজ", values: ["M", "L", "XL"] }],
    stock: [8, 8, 8],
    minimum: 2,
  },
  {
    name: "Leather sandal",
    sku: "SANDAL-LTH",
    category: "Footwear",
    price: 1650,
    cost: 1100,
    supplier: 3,
    axes: [{ name: "Size", values: ["39", "40", "41", "42"] }],
    stock: [3, 0, 2, 5],
    minimum: 2,
  },
  {
    name: "হিজাব",
    sku: "HIJAB-GEO",
    category: "আনুষঙ্গিক",
    price: 280,
    cost: 150,
    supplier: null,
    axes: [],
    stock: [1],
    minimum: 10,
  },
  {
    name: "Cotton panjabi",
    sku: "PANJABI-COT",
    category: "Clothing",
    price: 1450,
    cost: 900,
    supplier: 0,
    axes: [
      { name: "Size", values: ["M", "L", "XL"] },
      { name: "Colour", values: ["White", "Blue"] },
    ],
    stock: [10, 6, 12, 2, 5, 7],
    minimum: 3,
  },
];

export const DEMO_CUSTOMERS = [
  {
    name: "রিনা আক্তার",
    phone: "01711234567",
    address: "মিরপুর ১০, ঢাকা",
    riskLevel: 0,
    note: "নিয়মিত ক্রেতা; বিকেলে ফোন করবেন",
  },
  {
    name: "Karim Hossain",
    phone: "01819876543",
    address: "Agrabad, Chattogram",
    riskLevel: 1,
    note: "Prefers cash on delivery",
  },
  {
    name: "সাবরিনা ইসলাম",
    phone: "01922334455",
    address: "ধানমন্ডি ২৭, ঢাকা",
    riskLevel: 2,
    note: "দুবার পার্সেল ফেরত দিয়েছেন",
  },
  {
    name: "Nusrat Jahan",
    phone: "01633445566",
    address: "Zindabazar, Sylhet",
    riskLevel: 0,
    note: null,
  },
  {
    name: "মো. হাসান",
    phone: "01744556677",
    address: null,
    riskLevel: 3,
    note: "আগের বাকি এখনো দেননি",
  },
  // Shares Rina's phone (a family number): saved, with the duplicate-phone warning (BR3.3).
  {
    name: "রুমা আক্তার",
    phone: "01711234567",
    address: "মিরপুর ১০, ঢাকা",
    riskLevel: 0,
    note: null,
  },
] as const;

/** The variants of a demo product: the cross product of its axes, with its stock numbers. */
const demoVariants = (p: DemoProduct) => {
  const combos = p.axes.reduce<string[][]>(
    (acc, axis) => acc.flatMap((c) => axis.values.map((v) => [...c, v])),
    [[]],
  );
  return combos.map((axisValues, i) => ({
    axisValues,
    stock: p.stock[i] ?? p.stock[0] ?? 0,
    minimumStock: p.minimum,
  }));
};

export interface CatalogSeedClients {
  readonly manager: Client;
  readonly sales: Client;
  readonly accountant: Client;
}

export interface CatalogSeedResult {
  readonly suppliers: number;
  readonly products: number;
  readonly skippedProducts: number;
  readonly customers: number;
}

/** Add the demo catalog through the API; what is already there is left alone (R-05). */
export const seedDemoCatalog = async (c: CatalogSeedClients): Promise<CatalogSeedResult> => {
  const listed = await c.manager.must("GET", "/api/suppliers");
  const existing = new Map(
    ((listed["suppliers"] as Array<{ id: string; name: string }> | undefined) ?? []).map((s) => [
      s.name,
      s.id,
    ]),
  );
  const supplierIds: string[] = [];
  let suppliers = 0;
  for (const s of DEMO_SUPPLIERS) {
    const known = existing.get(s.name);
    if (known !== undefined) {
      supplierIds.push(known);
      continue;
    }
    const made = await c.manager.must("POST", "/api/suppliers", s);
    supplierIds.push(String((made["supplier"] as JsonObject)["id"]));
    suppliers += 1;
  }

  let products = 0;
  let skippedProducts = 0;
  for (const p of DEMO_PRODUCTS) {
    const supplierId = p.supplier === null ? null : (supplierIds[p.supplier] ?? null);
    const r = await c.manager.call("POST", "/api/products", {
      name: p.name,
      sku: p.sku,
      ...(p.category !== null ? { category: p.category } : {}),
      sellingPricePaise: paise(p.price),
      defaultSupplierId: supplierId,
      axes: p.axes,
      variants: demoVariants(p),
    });
    if (r.status === 409) {
      skippedProducts += 1; // R-05: the SKU is already there; a rerun adds nothing twice.
      continue;
    }
    if (r.status !== 201) throw new Error(`create product ${p.sku} → ${r.status}`);
    const productId = String((r.json["product"] as JsonObject)["id"]);
    // The Accountant records the purchase cost (BR1.4); one product keeps it unrecorded.
    if (p.cost !== null) {
      await c.accountant.must("PATCH", `/api/products/${productId}/cost`, {
        purchaseCostPaise: paise(p.cost),
      });
    }
    products += 1;
  }

  let customers = 0;
  for (const d of DEMO_CUSTOMERS) {
    const found = await c.sales.must("GET", `/api/customers?q=${encodeURIComponent(d.phone)}`);
    const rows = (found["customers"] as Array<{ name: string }> | undefined) ?? [];
    if (rows.some((row) => row.name === d.name)) continue;
    const made = await c.sales.must("POST", "/api/customers", {
      name: d.name,
      phone: d.phone,
      ...(d.address !== null ? { address: d.address } : {}),
      riskLevel: d.riskLevel,
      ...(d.note !== null ? { note: d.note } : {}),
    });
    customers += 1;
    // One note revised, so the "আগের নোট" history has something to show (BR4.4).
    if (d.riskLevel === 2) {
      const id = String((made["customer"] as JsonObject)["id"]);
      const detail = await c.sales.must("GET", `/api/customers/${id}`);
      const first = ((detail["notes"] as Array<{ id: string }> | undefined) ?? [])[0];
      if (first !== undefined) {
        await c.sales.must("POST", `/api/customers/${id}/notes`, {
          text: "দুবার পার্সেল ফেরত দিয়েছেন; এখন অগ্রিম নিয়ে পাঠাবেন",
          revisesNoteId: first.id,
        });
      }
    }
  }
  return { suppliers, products, skippedProducts, customers };
};

const tokenOf = (link: string): string => {
  const m = /[?&]t=([^&]+)/.exec(link);
  if (!m?.[1]) throw new Error("invitation link without a token");
  return m[1];
};

const main = async (): Promise<void> => {
  const health = await fetch(`${BASE}/api/health`).catch(() => null);
  if (!health || health.status !== 200) {
    throw new Error(`the app is not answering on ${BASE}; start it with \`bun run start\``);
  }
  const setup = await new Client().must("GET", "/api/setup");
  if (setup["businessExists"] === true) {
    throw new Error("a business already exists here; the demo seed runs on an empty database only");
  }

  const accounts = loadAccounts();
  const account = (role: Role): Account => accounts.find((a) => a.role === role)!;
  const clients = new Map<Role, Client>();

  // 1. The Owner creates the business (the first sign-up is the Owner).
  const owner = new Client();
  const o = account("owner");
  await owner.must("POST", "/api/auth/sign-up", {
    businessName: "রহিম ফ্যাশন হাউস",
    email: o.email,
    password: o.password,
  });
  clients.set("owner", owner);

  // 2. Staff: three invitations accepted, one left pending.
  for (const role of ["manager", "sales_staff", "accountant"] as const) {
    const a = account(role);
    const inv = await owner.must("POST", "/api/staff/invitations", { email: a.email, role });
    const staff = new Client();
    await staff.must("POST", "/api/invitations/accept", {
      token: tokenOf(String(inv["link"])),
      password: a.password,
    });
    clients.set(role, staff);
  }
  await owner.must("POST", "/api/staff/invitations", {
    email: "new-sales@smartbiz.test",
    role: "sales_staff",
  });

  // 3. Orders, created by the staff member who would take them, then moved along.
  let created = 0;
  for (const d of ORDERS) {
    const by = clients.get(d.by)!;
    const body = {
      source: d.source,
      customerId: null,
      contact: { name: d.name, phone: d.phone, address: d.address },
      repeatOfOrderId: null,
      items: d.lines.map((l) => ({
        variantId: null,
        description: l.description,
        quantity: l.quantity,
        unitPricePaise: paise(l.price),
        lineDiscountPaise: paise(l.discount ?? 0),
      })),
      orderDiscountPaise: paise(d.orderDiscount ?? 0),
      deliveryChargePaise: paise(d.delivery),
    };
    // A role without the create capability falls back to the Owner (the gate decides).
    let r = await by.call("POST", "/api/orders", body);
    if (r.status === 403) r = await owner.call("POST", "/api/orders", body);
    if (r.status >= 300) throw new Error(`create order → ${r.status} ${JSON.stringify(r.json)}`);
    const order = r.json["order"] as JsonObject | undefined;
    const id = String(order?.["id"] ?? r.json["id"]);
    created += 1;

    for (const to of d.path) {
      const actor = to === "settled" ? clients.get("accountant")! : clients.get("manager")!;
      let t = await actor.call("POST", `/api/orders/${id}/status`, { to });
      if (t.status === 403) t = await owner.call("POST", `/api/orders/${id}/status`, { to });
      if (t.status >= 300)
        throw new Error(`move ${id} to ${to} → ${t.status} ${JSON.stringify(t.json)}`);
      if (to === "packed" && d.consignment) {
        await owner.must("POST", `/api/orders/${id}/consignment`, {
          consignmentRef: d.consignment,
        });
      }
    }
  }

  // 4. U4 (Q16): the demo catalog.
  const catalog = await seedDemoCatalog({
    manager: clients.get("manager")!,
    sales: clients.get("sales_staff")!,
    accountant: clients.get("accountant")!,
  });

  // eslint-disable-next-line no-console -- CLI script: the one-line result is its output.
  console.log(
    `seed:demo ok — business, 3 staff + 1 pending invitation, ${created} orders, ` +
      `${catalog.suppliers} suppliers, ${catalog.products} products, ${catalog.customers} customers. ` +
      `Sign-in accounts are in .env.demo.`,
  );
};

if (import.meta.main) {
  main().catch((e: unknown) => {
    console.error(`seed:demo failed: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  });
}
