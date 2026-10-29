/**
 * scripts/seed-demo-catalog.ts — `bun run seed:demo:catalog`: add the demo catalog to an
 * EXISTING demo business (U4 infrastructure-design Q4, review R-05; Bolt 2 merge step 6).
 *
 * `bun run seed:demo` refuses when a business exists, because its first sign-up is the
 * Owner. A demo database seeded before U4 already holds the Bolt 1 demo — its business,
 * staff and orders — and reseeding from zero would lose them. This script keeps them and adds
 * only the catalog, through the app's own HTTP API (so every row has its change-log row and
 * passes the same role gate and validation): suppliers, products with sizes and colours, and
 * customers with notes (`seedDemoCatalog` in scripts/seed-demo.ts, shared with seed:demo).
 *
 * Preconditions, each stopping with a named message: the app answers on 127.0.0.1:PORT;
 * a business exists (`GET /api/setup`); `.env.demo` exists with the demo accounts (it is never
 * created here); and the Manager, Sales Staff and Accountant accounts sign in.
 * Re-runnable (R-05): a product whose SKU is already taken (409) is skipped, and a supplier
 * or customer that is already there is left alone, so a second run adds nothing twice.
 * Credentials are read from `.env.demo` and never printed.
 *
 * Usage: start the app (`bun run start`), then `bun run seed:demo:catalog` (PORT defaults to
 * 3000).
 */
import { BASE, Client, loadAccounts, seedDemoCatalog, type Role } from "./seed-demo.js";

const signedIn = async (email: string, password: string, role: Role): Promise<Client> => {
  const c = new Client();
  const r = await c.call("POST", "/api/auth/sign-in", { email, password });
  if (r.status !== 200) {
    throw new Error(`the demo ${role} account does not sign in (${r.status}); check .env.demo`);
  }
  return c;
};

const main = async (): Promise<void> => {
  const health = await fetch(`${BASE}/api/health`).catch(() => null);
  if (!health || health.status !== 200) {
    throw new Error(`the app is not answering on ${BASE}; start it with \`bun run start\``);
  }
  const setup = await new Client().must("GET", "/api/setup");
  if (setup["businessExists"] !== true) {
    throw new Error("no business exists here yet; run `bun run seed:demo` for a full demo");
  }
  const accounts = loadAccounts(false);
  const account = (role: Role) => {
    const a = accounts.find((x) => x.role === role);
    if (a === undefined) throw new Error(`.env.demo is missing the ${role} account`);
    return a;
  };
  const clients = {
    manager: await signedIn(account("manager").email, account("manager").password, "manager"),
    sales: await signedIn(
      account("sales_staff").email,
      account("sales_staff").password,
      "sales_staff",
    ),
    accountant: await signedIn(
      account("accountant").email,
      account("accountant").password,
      "accountant",
    ),
  };
  const r = await seedDemoCatalog(clients);
  // eslint-disable-next-line no-console -- CLI script: the one-line result is its output.
  console.log(
    `seed:demo:catalog ok — ${r.suppliers} suppliers, ${r.products} products ` +
      `(${r.skippedProducts} already there), ${r.customers} customers added.`,
  );
};

if (import.meta.main) {
  main().catch((e: unknown) => {
    console.error(`seed:demo:catalog failed: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  });
}
