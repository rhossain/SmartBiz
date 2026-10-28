/**
 * scripts/seed-demo.ts — `bun run seed:demo`: fill a fresh local deployment with demo data
 * through the app's own HTTP API, so every record carries its audit rows and passes the same
 * role gate, validation and status rules a person typing it in would.
 *
 * What it creates: the Owner's business, three staff (manager, sales staff, accountant) who
 * accept their invitations, one invitation left pending, and 16 orders from several sources
 * moved through every order status (new, confirmed, packed, shipped, delivered, settled,
 * partial, cancelled, returned), with courier consignment references on the shipped ones.
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
const BASE = `http://127.0.0.1:${PORT}`;
const CRED_FILE = join(ROOT, ".env.demo");

type Role = "owner" | "manager" | "sales_staff" | "accountant";
interface Account {
  readonly role: Role;
  readonly email: string;
  readonly password: string;
}

const randomPassword = (): string => `Demo-${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;

/** Load the demo accounts from `.env.demo`, creating the file on the first run. */
const loadAccounts = (): Account[] => {
  const roles: Role[] = ["owner", "manager", "sales_staff", "accountant"];
  if (!existsSync(CRED_FILE)) {
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
type JsonObject = { readonly [key: string]: unknown };

/** One signed-in client: keeps its own session cookie. */
class Client {
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

  // eslint-disable-next-line no-console -- CLI script: the one-line result is its output.
  console.log(
    `seed:demo ok — business, 3 staff + 1 pending invitation, ${created} orders. ` +
      `Sign-in accounts are in .env.demo.`,
  );
};

if (import.meta.main) {
  main().catch((e: unknown) => {
    console.error(`seed:demo failed: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  });
}
