/**
 * scripts/seed-demo-today.ts — `bun run seed:demo:today`: give the demo business a believable
 * "today" for the daily card, on whatever day the demo actually happens.
 *
 * Through the app's own HTTP API (audit rows, role gate, validation and status rules apply) it
 * creates a handful of orders linked to existing customers and in-stock variants, and moves them
 * on: two paid in advance (settled), some confirmed or packed, the rest new. Then, as the
 * database admin (MIGRATE_DATABASE_URL from .env.migrate), demo data only, it spreads their
 * creation times across today's business hours in Dhaka so they do not all show the same
 * minute; each order's audit rows move with it, in order, with their retention span.
 *
 * Re-runnable: every run adds another set for the current Dhaka day. Needs `bun run start`
 * and the demo accounts in `.env.demo` (seed:demo, then ideally seed:demo:more).
 *
 * Usage: `bun run seed:demo:today` (COUNT defaults to 7).
 */
import postgres from "postgres";
import { Client, loadAccounts, type JsonObject } from "./seed-demo.js";

const BASE = `http://127.0.0.1:${process.env["PORT"] ?? "3000"}`;
const COUNT = Number(process.env["COUNT"] ?? "7");
const DAY = 86_400_000;
const HOUR = 3_600_000;
const MIN = 60_000;

const pick = <T>(xs: readonly T[]): T => xs[Math.floor(Math.random() * xs.length)] as T;
const FINALS = ["settled", "confirmed", "new", "packed", "settled", "confirmed", "new", "shipped"];
const PATHS: Readonly<Record<string, readonly string[]>> = {
  new: [],
  confirmed: ["confirmed"],
  packed: ["confirmed", "packed"],
  shipped: ["confirmed", "packed", "shipped"],
  settled: ["confirmed", "packed", "shipped", "delivered", "settled"],
};

const fail = (msg: string): never => {
  throw new Error(msg);
};

const main = async (): Promise<void> => {
  const adminUrl =
    process.env["MIGRATE_DATABASE_URL"] ?? fail("MIGRATE_DATABASE_URL is not set (.env.migrate)");
  const health = await fetch(`${BASE}/api/health`).catch(() => null);
  if (!health || health.status !== 200) fail(`the app is not answering on ${BASE}`);

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

  const customers = ((await sales.must("GET", "/api/customers?limit=50"))["customers"] ??
    []) as JsonObject[];
  if (customers.length === 0) fail("no customers; run seed:demo first");

  // In-stock variants only, so packing never runs short.
  const products = ((await manager.must("GET", "/api/products"))["products"] ?? []) as JsonObject[];
  const lines: Array<{ variantId: string; label: string; price: number }> = [];
  for (const p of products) {
    const d = await manager.must("GET", `/api/products/${String(p["id"])}`);
    for (const v of (d["variants"] as JsonObject[] | undefined) ?? []) {
      if (Number(v["stock"]) < 4) continue;
      const values = (v["axisValues"] as string[] | undefined) ?? [];
      lines.push({
        variantId: String(v["id"]),
        label:
          values.length > 0 ? `${String(d["name"])} (${values.join(", ")})` : String(d["name"]),
        price: Number(d["sellingPricePaise"]),
      });
    }
  }
  if (lines.length === 0) fail("no variant has stock");

  const move = async (id: string, to: string): Promise<void> => {
    const actor = to === "settled" ? accountant : manager;
    // A role without the transition capability falls back to the Owner (the gate decides).
    const r = await actor.call("POST", `/api/orders/${id}/status`, { to });
    if (r.status === 403) await owner.must("POST", `/api/orders/${id}/status`, { to });
    else if (r.status >= 300) fail(`move ${id} to ${to} → ${r.status}`);
    if (to === "packed") {
      await owner.must("POST", `/api/orders/${id}/consignment`, {
        consignmentRef: `SF-${String(60000 + Math.floor(Math.random() * 39999))}`,
      });
    }
  };

  const created: string[] = [];
  for (let i = 0; i < COUNT; i += 1) {
    const c = pick(customers);
    const count = Math.random() < 0.3 ? 2 : 1;
    const chosen = new Map<string, (typeof lines)[number]>();
    while (chosen.size < count) {
      const l = pick(lines);
      chosen.set(l.variantId, l);
    }
    const address = (c["address"] as string | null | undefined) ?? null;
    const inDhaka = (address ?? "").includes("ঢাকা") || (address ?? "").includes("Dhaka");
    const made = await sales.must("POST", "/api/orders", {
      source: pick(["paste-parse", "manual", "paste-parse", "quick-add"] as const),
      customerId: String(c["id"]),
      contact: { name: String(c["name"]), phone: String(c["phone"]), address },
      repeatOfOrderId: null,
      items: [...chosen.values()].map((l) => ({
        variantId: l.variantId,
        description: l.label,
        quantity: Math.random() < 0.25 ? 2 : 1,
        unitPricePaise: l.price,
        lineDiscountPaise: 0,
      })),
      orderDiscountPaise: 0,
      deliveryChargePaise: inDhaka ? 6000 : 12000,
    });
    const id = String(((made["order"] as JsonObject | undefined) ?? made)["id"]);
    for (const to of PATHS[FINALS[i % FINALS.length] ?? "new"] ?? []) await move(id, to);
    created.push(id);
  }

  // Spread them over today's business hours in Dhaka (09:30 until 15 minutes ago).
  const now = Date.now();
  const dhakaMidnight = Math.floor((now + 6 * HOUR) / DAY) * DAY - 6 * HOUR;
  const latest = now - 15 * MIN;
  const earliest = Math.min(dhakaMidnight + 9.5 * HOUR, latest - 2 * HOUR);
  const sql = postgres(adminUrl, { max: 1, onnotice: () => undefined });
  await sql.begin(async (tx) => {
    for (const [i, id] of created.entries()) {
      const at = Math.round(earliest + ((latest - earliest) * (i + 0.5)) / created.length);
      const rows = await tx<{ id: string }[]>`
        select id from audit_log where subject_kind = 'order' and subject_id = ${id}
        order by occurred_at, id`;
      const room = Math.max(MIN, (latest - at) / Math.max(1, rows.length));
      let last = at;
      for (const [k, r] of rows.entries()) {
        last = Math.round(at + k * Math.min(25 * MIN, room));
        const when = new Date(last);
        await tx`update audit_log set retention_until = retention_until + (${when}::timestamptz - occurred_at),
                 occurred_at = ${when} where id = ${r.id}`;
      }
      await tx`update orders set created_at = ${new Date(at)}, updated_at = ${new Date(last)} where id = ${id}`;
      await tx`update consignment_link set linked_at = (
                 select occurred_at from audit_log where subject_kind = 'order' and subject_id = ${id}
                 and action = 'order.consignment.link' order by occurred_at limit 1)
               where order_id = ${id}`;
    }
  });
  await sql.end();

  // eslint-disable-next-line no-console -- CLI script: the one-line result is its output.
  console.log(`seed:demo:today ok — ${created.length} orders added for today (Dhaka).`);
};

if (import.meta.main) {
  main().catch((e: unknown) => {
    console.error(`seed:demo:today failed: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  });
}
