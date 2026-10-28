/**
 * scripts/browser-check.ts — `bun scripts/browser-check.ts`: the real-browser check, gate step
 * 14b (U2 P10, P11, O14; NFR6.14, NFR9.6, NFR8.15; AC1.7.4, AC1.7.5; BR9.1, BR10.1; review
 * D-02, I-01, I-02, N-05).
 *
 * Headless Google Chrome — the copy already installed on this machine, at `CHROME_PATH`
 * (default `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`) — driven over the
 * DevTools protocol with bun's own WebSocket; no new dependency (S17). It:
 *   1. creates and migrates its own `browser_<random>` database through REALDB_ADMIN_URL (as
 *      the wiring check does) and starts the server in-process (`startServer`) on a free
 *      loopback port, serving the built `dist/`, connected as the app login; it never runs
 *      `bun run start` and never reads `.env`;
 *   2. signs up the Owner `owner@browser.test` / `browser-pass-1` (throwaway credentials in a
 *      throwaway database, on the secret-scan allow-list) and creates one order over the API;
 *      U4: also one customer and one product with two axes (one variant low), so the catalog
 *      rows — `/customers`, `/products/:id` with its variant table, `/low-stock` among them —
 *      are walked at 360 px with real data;
 *   3. launches Chrome with `--headless=new --remote-debugging-port=0 --user-data-dir=<temp
 *      smartbiz-browser-*> --no-first-run --no-default-browser-check` and reads the
 *      `DevTools listening on ws://…` line (15 s);
 *   4. NFR6.14 / BR10.1: 5 cold loads of `/`, each in a fresh browser context with the cache
 *      off, polling `performance.timing.loadEventEnd` until it is above 0 (10 s per load);
 *      the median of `loadEventEnd − navigationStart` must be ≤ 2 000 ms;
 *   5. NFR9.6 / BR9.1: at 360 × 740 (scale 1), sign-in and not-found with no session (U3, NFR9.10:
 *      and `/accept-invite`, `/reset`, `/recover`), then
 *      sign-in through the real form (`Input.insertText`, Enter), then every screen row of
 *      tests/spec/role-table.ts the Owner may open; on each it waits up to 5 s for the row's
 *      heading and asserts `scrollWidth <= clientWidth`.
 * Exit codes (I-01): 0 pass; 2 ONLY when no file exists at `CHROME_PATH` ("not run", never a
 * pass); 1 for anything else — a launch failure, a timeout, a protocol error, an assertion.
 * Clean-up (I-02) runs in `finally` and on SIGINT/SIGTERM: Chrome is sent SIGTERM, then
 * SIGKILL after 3 s, and awaited; the temporary profile is removed; the server is stopped;
 * the database is dropped. The whole script is limited to 120 s.
 * One result line: `browser ok: median <ms> ms over 5 loads, <n> screens at 360 px`.
 */
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import postgres from "postgres";
import { runMigrations } from "../src/db/migrate.js";
import { readConfig } from "../src/server/config.js";
import { startServer, type RunningServer } from "../src/server/main.js";
import { isAllowed, SCREEN_ROWS, type ScreenRow } from "../tests/spec/role-table.js";
import { say } from "./lib/run.js";

const ROOT = join(import.meta.dir, "..");
export const DEFAULT_CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OWNER = { email: "owner@browser.test", password: "browser-pass-1" };
const DEVTOOLS_TIMEOUT_MS = 15_000;
const LOAD_TIMEOUT_MS = 10_000;
const HEADING_TIMEOUT_MS = 5_000;
const TOTAL_TIMEOUT_MS = 120_000;
const LOAD_BUDGET_MS = 2_000;
const COLD_LOADS = 5;

class CheckFailed extends Error {}

const median = (xs: ReadonlyArray<number>): number => {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? (s[mid] ?? 0) : ((s[mid - 1] ?? 0) + (s[mid] ?? 0)) / 2;
};

const withDb = (url: string, db: string): string => {
  const u = new URL(url);
  u.pathname = `/${db}`;
  return u.toString();
};

const freePort = (): number => {
  const probe = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch: () => new Response() });
  const port = probe.port ?? 0;
  void probe.stop(true);
  return port;
};

/* ------------------------------------------------------------------ DevTools protocol */

interface CdpReply {
  readonly id?: number;
  readonly result?: Record<string, unknown>;
  readonly error?: { readonly message: string };
}

/** A minimal DevTools client over one browser WebSocket, with flattened page sessions. */
class Cdp {
  private next = 0;
  private readonly pending = new Map<
    number,
    { resolve: (v: Record<string, unknown>) => void; reject: (e: Error) => void }
  >();

  private constructor(private readonly ws: WebSocket) {
    ws.addEventListener("message", (event) => {
      const msg = JSON.parse(String(event.data)) as CdpReply;
      if (msg.id === undefined) return;
      const waiter = this.pending.get(msg.id);
      if (!waiter) return;
      this.pending.delete(msg.id);
      if (msg.error) waiter.reject(new CheckFailed(`DevTools: ${msg.error.message}`));
      else waiter.resolve(msg.result ?? {});
    });
    ws.addEventListener("close", () => {
      for (const w of this.pending.values()) w.reject(new CheckFailed("DevTools socket closed"));
      this.pending.clear();
    });
  }

  static connect(url: string): Promise<Cdp> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      ws.addEventListener("open", () => resolve(new Cdp(ws)), { once: true });
      ws.addEventListener("error", () => reject(new CheckFailed("cannot open DevTools socket")), {
        once: true,
      });
    });
  }

  send(
    method: string,
    params: Record<string, unknown> = {},
    sessionId?: string,
  ): Promise<Record<string, unknown>> {
    this.next += 1;
    const id = this.next;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new CheckFailed(`DevTools ${method} timed out`));
      }, LOAD_TIMEOUT_MS);
      this.pending.set(id, {
        resolve: (v) => {
          clearTimeout(timer);
          resolve(v);
        },
        reject: (e) => {
          clearTimeout(timer);
          reject(e);
        },
      });
      this.ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }

  close(): void {
    this.ws.close();
  }
}

/** A page target in its own browser context, attached with a flattened session. */
interface Page {
  readonly sessionId: string;
  readonly targetId: string;
  readonly contextId: string;
}

const openPage = async (cdp: Cdp): Promise<Page> => {
  const ctx = await cdp.send("Target.createBrowserContext");
  const contextId = String(ctx["browserContextId"]);
  const target = await cdp.send("Target.createTarget", {
    url: "about:blank",
    browserContextId: contextId,
  });
  const targetId = String(target["targetId"]);
  const attached = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
  const sessionId = String(attached["sessionId"]);
  for (const m of ["Page.enable", "Runtime.enable", "Network.enable"]) {
    await cdp.send(m, {}, sessionId);
  }
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true }, sessionId);
  return { sessionId, targetId, contextId };
};

const closePage = async (cdp: Cdp, page: Page): Promise<void> => {
  await cdp.send("Target.closeTarget", { targetId: page.targetId });
  await cdp.send("Target.disposeBrowserContext", { browserContextId: page.contextId });
};

const evaluate = async (cdp: Cdp, page: Page, expression: string): Promise<unknown> => {
  const r = await cdp.send(
    "Runtime.evaluate",
    { expression, returnByValue: true, awaitPromise: true },
    page.sessionId,
  );
  if (r["exceptionDetails"] !== undefined) {
    throw new CheckFailed(`page script failed: ${expression.slice(0, 60)}`);
  }
  return (r["result"] as { value?: unknown } | undefined)?.value;
};

const waitUntil = async (
  cdp: Cdp,
  page: Page,
  expression: string,
  limitMs: number,
  what: string,
): Promise<unknown> => {
  const deadline = performance.now() + limitMs;
  while (performance.now() < deadline) {
    const v = await evaluate(cdp, page, expression);
    if (v !== null && v !== undefined && v !== false && v !== 0) return v;
    await Bun.sleep(100);
  }
  throw new CheckFailed(`timed out after ${limitMs} ms: ${what}`);
};

/* ------------------------------------------------------------------ the checks */

/** NFR6.14: one cold load of `/` in a fresh context; loadEventEnd − navigationStart in ms. */
const coldLoad = async (cdp: Cdp, base: string): Promise<number> => {
  const page = await openPage(cdp);
  try {
    await cdp.send("Page.navigate", { url: `${base}/` }, page.sessionId);
    const ms = await waitUntil(
      cdp,
      page,
      "performance.timing.loadEventEnd > 0 ? performance.timing.loadEventEnd - performance.timing.navigationStart : 0",
      LOAD_TIMEOUT_MS,
      "loadEventEnd",
    );
    return Number(ms);
  } finally {
    await closePage(cdp, page);
  }
};

const headingExpr = (row: Pick<ScreenRow, "headingTestId">): string =>
  `document.querySelector('[data-testid="${row.headingTestId}"]')?.textContent ?? null`;

/**
 * 'ok', or the overflow and the outermost elements that stick out past the window (outside a
 * `.scroll-x` box), so a failure says what to fix.
 */
const NO_SIDEWAYS = `(() => {
  const d = document.documentElement;
  if (d.scrollWidth <= d.clientWidth) return 'ok';
  const out = [...document.body.querySelectorAll('*')]
    .filter((el) => el.getBoundingClientRect().right > d.clientWidth + 0.5)
    .filter((el) => !el.closest('.scroll-x') || el.classList.contains('scroll-x'))
    .filter((el) => !el.parentElement || el.parentElement.getBoundingClientRect().right <= d.clientWidth + 0.5)
    .slice(0, 5)
    .map((el) => el.tagName.toLowerCase() + (el.dataset.testid ? '[' + el.dataset.testid + ']' : '') +
      ' ' + Math.round(el.getBoundingClientRect().width) + 'px');
  return 'scroll ' + d.scrollWidth + ' > ' + d.clientWidth + ': ' + out.join(', ');
})()`;

/** Go to `hash` and wait for `heading`; then nothing may scroll sideways (BR9.1). */
const visit = async (
  cdp: Cdp,
  page: Page,
  hash: string,
  row: Pick<ScreenRow, "headingTestId">,
  heading: string,
): Promise<void> => {
  await evaluate(cdp, page, `location.hash = ${JSON.stringify(hash)}; true`);
  await waitUntil(
    cdp,
    page,
    `(${headingExpr(row)}) === ${JSON.stringify(heading)}`,
    HEADING_TIMEOUT_MS,
    `#${hash} heading "${heading}"`,
  );
  const fit = await evaluate(cdp, page, NO_SIDEWAYS);
  if (fit !== "ok") throw new CheckFailed(`#${hash} at 360 px: ${String(fit)}`);
};

const signInThroughForm = async (cdp: Cdp, page: Page): Promise<void> => {
  for (const [testId, text] of [
    ["field-email", OWNER.email],
    ["field-password", OWNER.password],
  ] as const) {
    await evaluate(cdp, page, `document.querySelector('[data-testid="${testId}"]').focus(); true`);
    await cdp.send("Input.insertText", { text }, page.sessionId);
  }
  for (const type of ["keyDown", "keyUp"] as const) {
    await cdp.send(
      "Input.dispatchKeyEvent",
      {
        type,
        key: "Enter",
        code: "Enter",
        windowsVirtualKeyCode: 13,
        ...(type === "keyDown" ? { text: "\r" } : {}),
      },
      page.sessionId,
    );
  }
  await waitUntil(cdp, page, `location.hash === "#/orders"`, HEADING_TIMEOUT_MS, "signed in");
};

interface NamedRecord {
  readonly id: string;
  readonly name: string;
}

const screenWalk = async (
  cdp: Cdp,
  base: string,
  order: { readonly id: string; readonly orderNo: string },
  catalog: { readonly customer: NamedRecord; readonly product: NamedRecord },
): Promise<number> => {
  const page = await openPage(cdp);
  try {
    await cdp.send(
      "Emulation.setDeviceMetricsOverride",
      { width: 360, height: 740, deviceScaleFactor: 1, mobile: true },
      page.sessionId,
    );
    await cdp.send("Page.navigate", { url: `${base}/#/sign-in` }, page.sessionId);
    const byPath = (p: string): ScreenRow => {
      const row = SCREEN_ROWS.find((r) => r.path === p);
      if (!row) throw new CheckFailed(`role table has no row ${p}`);
      return row;
    };
    let screens = 0;
    // With no session: sign-in and not-found.
    const signIn = byPath("/sign-in");
    await visit(cdp, page, "/sign-in", signIn, signIn.heading);
    const notFound = byPath("/not-found");
    await visit(cdp, page, "/nowhere", notFound, notFound.heading);
    screens += 2;
    // U3 (NFR9.10): the public token and recovery screens at 360 px, signed out. `/staff` is
    // walked below with the Owner's other rows.
    for (const path of ["/accept-invite", "/reset", "/recover"]) {
      const row = byPath(path);
      await visit(cdp, page, path, row, row.heading);
      screens += 1;
    }
    await evaluate(cdp, page, `location.hash = "/sign-in"; true`);
    await waitUntil(
      cdp,
      page,
      `(${headingExpr(signIn)}) === "সাইন ইন"`,
      HEADING_TIMEOUT_MS,
      "sign-in",
    );
    await signInThroughForm(cdp, page);
    // Every screen row the Owner may open (P11).
    // U4: `/customers`, `/products/:id` (its variant table in `.scroll-x`) and `/low-stock`
    // join the walk with the other catalog rows; a catalog `:id` is this run's customer or
    // product, whose detail heading is its name.
    for (const row of SCREEN_ROWS) {
      if (row.allowed === "public" || !isAllowed(row.allowed, "owner")) continue;
      const record = row.path.startsWith("/customers/:id")
        ? catalog.customer
        : row.path.startsWith("/products/:id")
          ? catalog.product
          : null;
      const hash = row.path.replace(":id", record?.id ?? order.id);
      const heading =
        record !== null
          ? row.path.endsWith("/edit")
            ? row.heading
            : record.name
          : row.path.includes(":id")
            ? order.orderNo
            : row.heading;
      await visit(cdp, page, hash, row, heading);
      screens += 1;
    }
    return screens;
  } finally {
    await closePage(cdp, page);
  }
};

/* ------------------------------------------------------------------ resources and clean-up */

interface Resources {
  chrome: ReturnType<typeof Bun.spawn> | null;
  profile: string | null;
  server: RunningServer | null;
  dbName: string | null;
  cdp: Cdp | null;
}

const resources: Resources = { chrome: null, profile: null, server: null, dbName: null, cdp: null };
let cleaned: Promise<void> | null = null;

const cleanUp = (): Promise<void> => {
  cleaned ??= (async () => {
    resources.cdp?.close();
    const chrome = resources.chrome;
    if (chrome !== null) {
      chrome.kill("SIGTERM");
      const killer = setTimeout(() => chrome.kill("SIGKILL"), 3_000);
      await chrome.exited;
      clearTimeout(killer);
    }
    if (resources.profile !== null) rmSync(resources.profile, { recursive: true, force: true });
    if (resources.server !== null) await resources.server.stop();
    const admin = process.env["REALDB_ADMIN_URL"];
    if (resources.dbName !== null && admin) {
      const s = postgres(admin, { max: 1, onnotice: () => undefined });
      await s.unsafe(`DROP DATABASE IF EXISTS "${resources.dbName}" WITH (FORCE)`);
      await s.end({ timeout: 5 });
    }
  })();
  return cleaned;
};

/** Start Chrome and read its DevTools address from stderr (15 s, I-02). */
const launchChrome = async (chromePath: string, profile: string): Promise<string> => {
  const chrome = Bun.spawn(
    [
      chromePath,
      "--headless=new",
      "--remote-debugging-port=0",
      `--user-data-dir=${profile}`,
      "--no-first-run",
      "--no-default-browser-check",
      "about:blank",
    ],
    { stdout: "ignore", stderr: "pipe", stdin: "ignore" },
  );
  resources.chrome = chrome;
  const reader = (chrome.stderr as ReadableStream<Uint8Array>).getReader();
  const decoder = new TextDecoder();
  let seen = "";
  const deadline = performance.now() + DEVTOOLS_TIMEOUT_MS;
  while (performance.now() < deadline) {
    const chunk = await Promise.race([
      reader.read(),
      Bun.sleep(Math.max(0, deadline - performance.now())).then(() => null),
    ]);
    if (chunk === null || chunk.done) break;
    seen += decoder.decode(chunk.value, { stream: true });
    const m = /DevTools listening on (ws:\/\/\S+)/.exec(seen);
    if (m?.[1]) {
      // Keep draining stderr so Chrome never blocks on a full pipe.
      void (async () => {
        for (;;) if ((await reader.read()).done) return;
      })();
      return m[1];
    }
  }
  throw new CheckFailed("Chrome did not print its DevTools address within 15 s");
};

const main = async (): Promise<string> => {
  const admin = process.env["REALDB_ADMIN_URL"];
  const app = process.env["REALDB_APP_URL"];
  if (!admin || !app) throw new CheckFailed("REALDB_ADMIN_URL and REALDB_APP_URL must be set");
  const chromePath = process.env["CHROME_PATH"] || DEFAULT_CHROME;
  const dist = join(ROOT, "dist");
  if (!existsSync(join(dist, "index.html"))) {
    throw new CheckFailed("dist/index.html is missing; build first (gate step 8)");
  }

  // 1. own database, migrated; the server in-process on the built app.
  const dbName = `browser_${crypto.randomUUID().slice(0, 8)}`;
  const s = postgres(admin, { max: 1, onnotice: () => undefined });
  await s.unsafe(`CREATE DATABASE "${dbName}"`);
  await s.end({ timeout: 5 });
  resources.dbName = dbName;
  await runMigrations(withDb(admin, dbName), () => undefined);
  const config = readConfig({ PORT: String(freePort()), DATABASE_URL: withDb(app, dbName) });
  if (!config.ok) throw new CheckFailed(config.error);
  resources.server = await startServer(config.value, { distDir: dist });
  const base = `http://127.0.0.1:${resources.server.port}`;

  // 2. the Owner and one order, over the API.
  const post = (path: string, body: unknown, cookie = "") =>
    fetch(`${base}${path}`, {
      method: "POST",
      headers: {
        Origin: base,
        "Content-Type": "application/json",
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: JSON.stringify(body),
    });
  const up = await post("/api/auth/sign-up", { businessName: "Browser Check", ...OWNER });
  if (up.status !== 201) throw new CheckFailed(`sign-up answered ${up.status}`);
  const cookie = (up.headers.get("Set-Cookie") ?? "").split(";")[0] ?? "";
  const created = await post(
    "/api/orders",
    {
      source: "manual",
      customerId: null,
      contact: { name: "রিনা", phone: "01711111111", address: null },
      repeatOfOrderId: null,
      items: [
        {
          variantId: null,
          description: "কুর্তি",
          quantity: 1,
          unitPricePaise: 55_000,
          lineDiscountPaise: 0,
        },
      ],
      orderDiscountPaise: 0,
      deliveryChargePaise: 6_000,
    },
    cookie,
  );
  if (created.status !== 201) throw new CheckFailed(`create order answered ${created.status}`);
  const order = (await created.json()) as { id: string; orderNo: string };
  // U4: a customer and a product with two axes (one variant low), for the catalog screens.
  const customerAt = await post(
    "/api/customers",
    { name: "রিনা আক্তার", phone: "01712345678", address: "মিরপুর ১০, ঢাকা", riskLevel: 2 },
    cookie,
  );
  if (customerAt.status !== 201)
    throw new CheckFailed(`create customer answered ${customerAt.status}`);
  const customer = ((await customerAt.json()) as { customer: NamedRecord }).customer;
  const sizes = ["S", "M", "L", "XL"];
  const colours = ["লাল", "নীল", "সবুজ"];
  const productAt = await post(
    "/api/products",
    {
      name: "সুতির থ্রি-পিস কুর্তি",
      sku: "BROWSER-KURTI",
      sellingPricePaise: 145_000,
      purchaseCostPaise: 98_000,
      axes: [
        { name: "সাইজ", values: sizes },
        { name: "রং", values: colours },
      ],
      variants: sizes.flatMap((s, i) =>
        colours.map((c) => ({ axisValues: [s, c], stock: i === 0 ? 1 : 12, minimumStock: 3 })),
      ),
    },
    cookie,
  );
  if (productAt.status !== 201)
    throw new CheckFailed(`create product answered ${productAt.status}`);
  const product = ((await productAt.json()) as { product: NamedRecord }).product;

  // 3. Chrome.
  resources.profile = mkdtempSync(join(tmpdir(), "smartbiz-browser-"));
  const wsUrl = await launchChrome(chromePath, resources.profile);
  resources.cdp = await Cdp.connect(wsUrl);

  // 4. five cold loads.
  const loads: number[] = [];
  for (let i = 0; i < COLD_LOADS; i++) loads.push(await coldLoad(resources.cdp, base));
  const mid = Math.round(median(loads));
  if (mid > LOAD_BUDGET_MS) {
    throw new CheckFailed(
      `median first load ${mid} ms > ${LOAD_BUDGET_MS} ms (${loads.join(", ")})`,
    );
  }

  // 5. the 360 px walk.
  const screens = await screenWalk(resources.cdp, base, order, { customer, product });
  return `browser ok: median ${mid} ms over ${COLD_LOADS} loads, ${screens} screens at 360 px`;
};

if (import.meta.main) {
  const chromePath = process.env["CHROME_PATH"] || DEFAULT_CHROME;
  if (!existsSync(chromePath)) {
    // I-01: the only "not run": there is no browser to run. Never reported as a pass.
    say(`browser: not run (no Chrome at ${chromePath})`);
    process.exit(2);
  }
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => {
      void cleanUp().finally(() => process.exit(130));
    });
  }
  const overall = setTimeout(() => {
    process.stderr.write(`browser FAILED: the check took over ${TOTAL_TIMEOUT_MS / 1000} s\n`);
    void cleanUp().finally(() => process.exit(1));
  }, TOTAL_TIMEOUT_MS);
  let code = 0;
  try {
    say(await main());
  } catch (e: unknown) {
    process.stderr.write(`browser FAILED: ${e instanceof Error ? e.message : String(e)}\n`);
    code = 1;
  } finally {
    await cleanUp();
    clearTimeout(overall);
  }
  process.exit(code);
}
