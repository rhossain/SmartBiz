/**
 * tests/e2e/wiring-check.ts — `bun run test:e2e`: the walking skeleton end to end on a real
 * Postgres and a real server process (W10; BR10.1–BR10.3; US1.1, US2.1a, US5.2a;
 * cicd-pipeline.md gate 14).
 *
 * 1. Stop with a clear message if REALDB_ADMIN_URL or REALDB_APP_URL is unset (a skip must
 *    never pass for green).
 * 2. Create a fresh, empty database on that server; migrate it twice — the second run must
 *    apply nothing — and compare app_role's privileges with the declared set exactly.
 * 3. Start `src/server/main.ts` as a child process on a free loopback port, connected as the
 *    app login; it must answer `/api/health` within 5 s of being started (NFR6.6).
 * 4. Over HTTP, from `businessExists: false`: sign up → session → create an order → list it
 *    → sign out → the old cookie answers 401. Every response carries the S5 headers.
 * 5. Insert one user per non-Owner role (admin SQL, argon2 hash), sign each in, and walk the
 *    server's registered route table: a role without the capability gets 403, one with it
 *    gets past the gate, exactly as the restated reach table says.
 * 6. A cross-origin POST and a non-JSON POST answer 403.
 * 7. In happy-dom, the real App, talking to the real server, renders every U1 route for the
 *    Owner (orders list, the three create screens, detail, lock, not-found).
 * U2 (AC5.2a.2 widened by units R-01; NFR4.2; S11):
 *   - step 5 walks the API rows of tests/spec/role-table.ts (the one role table), not a
 *     hand-kept list, and first checks they equal the registered route table both ways;
 *   - step 7 walks EVERY screen row of the role table for the Owner and waits for the row's
 *     heading (the detail rows use this run's real order number); the public entry routes
 *     (`/`, `/sign-in`, `/sign-up`) send a signed-in Owner on to the orders list;
 *   - one `GET /api/audit` as the Owner is read for the C1 headers, `Cache-Control:
 *     no-store` and `X-Correlation-Id` included.
 * U3 (NFR8.19, O18; NFR4.3, NFR3.20): step 5 fills `:userId` with the Sales Staff member;
 * then, over HTTP, the Owner invites a Sales Staff member (201 with the link, `no-store`), the
 * invitee accepts (201, signed in as sales_staff), the Owner creates a reset link for them,
 * they reset their password (204), and their old cookie then answers 401; the four audit rows
 * exist and none of their payloads holds an `@`. Step 7 renders `/staff` and the token
 * screens through the role table's screen rows.
 * The child server and the database are always removed. One result line; exit 1 on failure.
 */
import postgres from "postgres";
import { hashPassword } from "../../src/auth/argon2.js";
import type { Role } from "../../src/data/enums.js";
import { APP_ROLE, declaredGrantMap } from "../../src/db/declared-grants.js";
import { runMigrations } from "../../src/db/migrate.js";
import { routeKey, routes } from "../../src/server/routes.js";
import { API_ROWS, apiKey, isAllowed, SCREEN_ROWS } from "../spec/role-table.js";

const ADMIN = process.env["REALDB_ADMIN_URL"];
const APP = process.env["REALDB_APP_URL"];

const say = (line: string): void => {
  process.stdout.write(`${line}\n`);
};

class CheckFailed extends Error {}
const check = (ok: boolean, what: string): void => {
  if (!ok) throw new CheckFailed(what);
};

const withDb = (url: string, db: string): string => {
  const u = new URL(url);
  u.pathname = `/${db}`;
  return u.toString();
};

const S5: Readonly<Record<string, string>> = {
  "content-security-policy":
    "default-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "x-frame-options": "DENY",
};

const ALL: ReadonlyArray<Role> = ["owner", "manager", "sales_staff", "accountant"];

const ORDER = {
  source: "manual",
  customerId: null,
  contact: { name: "রিনা", phone: "01711111111", address: null },
  repeatOfOrderId: null,
  items: [
    {
      variantId: null,
      description: "কুর্তি",
      quantity: 2,
      unitPricePaise: 55_000,
      lineDiscountPaise: 0,
    },
  ],
  orderDiscountPaise: 0,
  deliveryChargePaise: 6_000,
};

const freePort = (): number => {
  const probe = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch: () => new Response() });
  const port = probe.port ?? 0;
  void probe.stop(true);
  return port;
};

const main = async (): Promise<void> => {
  if (!ADMIN || !APP) {
    process.stderr.write(
      "wiring-check: REALDB_ADMIN_URL and REALDB_APP_URL must be set (bun run gate sets them)\n",
    );
    process.exit(1);
  }
  const dbName = `e2e_${crypto.randomUUID().slice(0, 8)}`;
  const server0 = postgres(ADMIN, { max: 1, onnotice: () => undefined });
  await server0.unsafe(`CREATE DATABASE "${dbName}"`);
  await server0.end({ timeout: 5 });
  const adminUrl = withDb(ADMIN, dbName);
  const appUrl = withDb(APP, dbName);
  let child: ReturnType<typeof Bun.spawn> | null = null;
  const admin = postgres(adminUrl, { max: 2, onnotice: () => undefined });
  const facts: string[] = [];
  try {
    // 2. migrate twice; exact grants.
    const first = await runMigrations(adminUrl, () => undefined);
    const second = await runMigrations(adminUrl, () => undefined);
    check(
      first.applied.length > 0 && second.applied.length === 0,
      `second migrate applied ${second.applied.length}`,
    );
    const rows = await admin<{ relation: string; privilege: string }[]>`
      SELECT c.relname AS relation, a.privilege_type AS privilege
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      CROSS JOIN LATERAL aclexplode(c.relacl) a
      WHERE n.nspname = 'public' AND c.relkind IN ('r','S','v','m','p')
        AND a.grantee = (SELECT oid FROM pg_roles WHERE rolname = ${APP_ROLE})`;
    const actual = new Map<string, string[]>();
    for (const r of rows)
      actual.set(r.relation, [...(actual.get(r.relation) ?? []), r.privilege].sort());
    const declared = declaredGrantMap();
    check(
      JSON.stringify([...actual].sort()) ===
        JSON.stringify([...declared].map(([k, v]) => [k, [...v].sort()]).sort()),
      "app_role grants differ from the declared set",
    );
    facts.push(`migrations ${first.applied.length} then 0, grants exact`);

    // 3. the real server, as a child process.
    const port = freePort();
    const base = `http://127.0.0.1:${port}`;
    const env: Record<string, string> = {};
    for (const [k, v] of Object.entries(process.env)) if (v !== undefined) env[k] = v;
    delete env["MIGRATE_DATABASE_URL"];
    delete env["CI"];
    env["PORT"] = String(port);
    env["DATABASE_URL"] = appUrl;
    const started = performance.now();
    child = Bun.spawn(["bun", "src/server/main.ts"], { env, stdout: "ignore", stderr: "inherit" });
    let upAfter = -1;
    while (performance.now() - started < 10_000) {
      const ok = await fetch(`${base}/api/health`).then(
        (r) => r.ok,
        () => false,
      );
      if (ok) {
        upAfter = Math.round(performance.now() - started);
        break;
      }
      await Bun.sleep(50);
    }
    check(upAfter >= 0 && upAfter <= 5_000, `server not up within 5 s (${upAfter} ms)`);
    facts.push(`start-up ${upAfter} ms`);

    let responses = 0;
    const call = async (
      method: string,
      path: string,
      opts: { body?: unknown; cookie?: string; origin?: string | null; type?: string } = {},
    ): Promise<Response> => {
      const headers: Record<string, string> = {};
      if (method !== "GET") {
        if (opts.origin !== null) headers["Origin"] = opts.origin ?? base;
        headers["Content-Type"] = opts.type ?? "application/json";
      }
      if (opts.cookie) headers["Cookie"] = opts.cookie;
      const r = await fetch(`${base}${path}`, {
        method,
        headers,
        ...(method !== "GET" ? { body: JSON.stringify(opts.body ?? {}) } : {}),
      });
      responses += 1;
      for (const [name, value] of Object.entries(S5)) {
        check(
          r.headers.get(name) === value,
          `${method} ${path}: header ${name} is ${r.headers.get(name)}`,
        );
      }
      return r;
    };
    const cookieOf = (r: Response): string =>
      (r.headers.get("Set-Cookie") ?? "").split(";")[0] ?? "";

    // 4. the Owner's whole path, from an empty database.
    check(
      JSON.stringify(await (await call("GET", "/api/setup")).json()) === '{"businessExists":false}',
      "setup is not empty",
    );
    const up = await call("POST", "/api/auth/sign-up", {
      body: {
        businessName: "Wiring Check",
        email: "owner@wiring.test",
        password: "correct-horse-1",
      },
    });
    check(up.status === 201, `sign-up answered ${up.status}`);
    const owner = cookieOf(up);
    check(
      (await call("GET", "/api/session", { cookie: owner })).status === 200,
      "session after sign-up",
    );
    const created = await call("POST", "/api/orders", { cookie: owner, body: ORDER });
    check(created.status === 201, `create order answered ${created.status}`);
    const order = (await created.json()) as { id: string; orderNo: string; totalPaise: number };
    check(order.totalPaise === 2 * 55_000 + 6_000, `order total ${order.totalPaise}`);
    const listed = (await (await call("GET", "/api/orders", { cookie: owner })).json()) as {
      orders: Array<{ id: string }>;
    };
    check(listed.orders[0]?.id === order.id, "the new order is not first in the list");
    facts.push("sign-up → order → list");

    // 5. one user per non-Owner role, walked over the registered route table.
    const [biz] = await admin<{ id: string }[]>`SELECT id FROM businesses LIMIT 1`;
    const hash = await hashPassword("role-password-1");
    const tokens: Partial<Record<Role, string>> = { owner };
    const ids: Partial<Record<Role, string>> = {};
    for (const role of ["manager", "sales_staff", "accountant"] as const) {
      ids[role] = crypto.randomUUID();
      await admin`INSERT INTO users (id, business_id, email, password_hash, role, active, locale)
        VALUES (${ids[role] ?? ""}, ${biz?.id ?? ""}, ${`${role}@wiring.test`}, ${hash}, ${role}, true, 'bn')`;
      const r = await call("POST", "/api/auth/sign-in", {
        body: { email: `${role}@wiring.test`, password: "role-password-1" },
      });
      check(r.status === 200, `${role} sign-in answered ${r.status}`);
      tokens[role] = cookieOf(r);
    }
    check(
      JSON.stringify(routes.map(routeKey).sort()) === JSON.stringify(API_ROWS.map(apiKey).sort()),
      "the registered route table differs from the role table's API rows",
    );
    let walked = 0;
    for (const route of routes) {
      const row = API_ROWS.find((r) => apiKey(r) === routeKey(route));
      if (row === undefined || row.allowed === "public") continue;
      for (const role of ALL) {
        // U3: `:userId` is the Sales Staff member, whom the Owner and a Manager may reset.
        const path = route.path.replace(":id", order.id).replace(":userId", ids.sales_staff ?? "");
        const r = await call(route.method, path, { cookie: tokens[role] ?? "", body: {} });
        const allowed = isAllowed(row.allowed, role);
        check(
          allowed ? r.status !== 401 && r.status !== 403 : r.status === 403,
          `${role} on ${routeKey(route)} answered ${r.status}`,
        );
        walked += 1;
      }
    }
    facts.push(`${walked} role × route calls as the table says`);

    // 6. cross-origin and non-JSON writes.
    check(
      (
        await call("POST", "/api/orders", {
          cookie: owner,
          body: ORDER,
          origin: "http://evil.example",
        })
      ).status === 403,
      "cross-origin POST was not refused",
    );
    check(
      (await call("POST", "/api/orders", { cookie: owner, body: ORDER, type: "text/plain" }))
        .status === 403,
      "non-JSON POST was not refused",
    );

    // U2 (NFR4.2): the audit read carries the C1 headers like every API answer.
    // U3: the role walk now also writes reset-link rows, so read a full page, not five.
    const audit = await call("GET", "/api/audit?limit=50", { cookie: owner });
    check(audit.status === 200, `GET /api/audit answered ${audit.status}`);
    check(audit.headers.get("cache-control") === "no-store", "audit answer is cacheable");
    check(
      /^[0-9a-f]{16}$/.test(audit.headers.get("x-correlation-id") ?? ""),
      "audit answer has no correlation id",
    );
    const page = (await audit.json()) as { entries: Array<{ action: string }> };
    check(
      page.entries.some((e) => e.action === "order.create"),
      "the audit trail does not show the order",
    );
    facts.push("audit read with C1 headers");

    // U3 (NFR8.19): invite → accept (signed in) → reset link → reset → the old cookie is dead.
    const tokenIn = (link: string): string => /[?&]t=([A-Za-z0-9_-]{43})$/.exec(link)?.[1] ?? "";
    const invited = await call("POST", "/api/staff/invitations", {
      cookie: owner,
      body: { email: "New.Staff@Wiring.test", role: "sales_staff" },
    });
    check(invited.status === 201, `invite answered ${invited.status}`);
    check(invited.headers.get("cache-control") === "no-store", "the invitation link is cacheable");
    const inviteLink = ((await invited.json()) as { link: string }).link;
    check(
      inviteLink.startsWith(`${base}/#/accept-invite?t=`) && tokenIn(inviteLink) !== "",
      "the invitation link is not a link to this server",
    );
    const accepted = await call("POST", "/api/invitations/accept", {
      body: { token: tokenIn(inviteLink), password: "staff-password-1" },
    });
    check(accepted.status === 201, `accept answered ${accepted.status}`);
    const staffUser = (await accepted.json()) as { id: string; email: string; role: string };
    check(
      staffUser.email === "new.staff@wiring.test" && staffUser.role === "sales_staff",
      `accept made ${staffUser.email} ${staffUser.role}`,
    );
    const staffCookie = cookieOf(accepted);
    const staffSession = await call("GET", "/api/session", { cookie: staffCookie });
    check(staffSession.status === 200, "the invitee is not signed in after accepting");
    const linked = await call("POST", `/api/staff/${staffUser.id}/reset-links`, {
      cookie: owner,
      body: {},
    });
    check(linked.status === 201, `reset link answered ${linked.status}`);
    check(linked.headers.get("cache-control") === "no-store", "the reset link is cacheable");
    const resetLink = ((await linked.json()) as { link: string }).link;
    const reset = await call("POST", "/api/auth/reset", {
      body: { token: tokenIn(resetLink), password: "staff-password-2" },
    });
    check(reset.status === 204, `reset answered ${reset.status}`);
    check(
      (await call("GET", "/api/session", { cookie: staffCookie })).status === 401,
      "the staff member's old cookie still works after the reset",
    );
    const staffAudit = await admin<{ action: string; payload: string }[]>`
      SELECT action, payload::text AS payload FROM audit_log
      WHERE action IN ('auth.invite_created', 'auth.invite_accepted', 'auth.reset_link_created',
                       'auth.password_reset')
      ORDER BY occurred_at
    `;
    // The role walk above wrote reset-link rows of its own first; this flow's four come last.
    check(
      staffAudit
        .slice(-4)
        .map((a) => a.action)
        .join(",") ===
        "auth.invite_created,auth.invite_accepted,auth.reset_link_created,auth.password_reset",
      `staff audit rows: ${staffAudit.map((a) => a.action).join(",")}`,
    );
    check(
      staffAudit.every((a) => !a.payload.includes("@")),
      "a staff audit payload holds an email",
    );
    facts.push("invite → accept → reset link → reset → old cookie 401; audit without email");

    // 7. the real App in happy-dom against the real server, as the Owner.
    const rendered = await renderAllRoutes(base, order.id, order.orderNo);
    facts.push(`${rendered} screens rendered`);

    // 4 (end). sign out; the old cookie is dead.
    check((await call("POST", "/api/auth/sign-out", { cookie: owner })).status === 204, "sign-out");
    check(
      (await call("GET", "/api/session", { cookie: owner })).status === 401,
      "the signed-out cookie still works",
    );
    facts.push(`S5 headers on ${responses} responses`);
    say(`wiring-check ok: ${facts.join("; ")}`);
  } finally {
    child?.kill("SIGTERM");
    await child?.exited;
    await admin.end({ timeout: 5 });
    const s = postgres(ADMIN, { max: 1, onnotice: () => undefined });
    await s.unsafe(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`);
    await s.end({ timeout: 5 });
  }
};

/** Mount the App in happy-dom with a fetch that behaves like the browser on `base`. */
const renderAllRoutes = async (base: string, orderId: string, orderNo: string): Promise<number> => {
  const { Window } = await import("happy-dom");
  const window = new Window({ url: `${base}/` });
  for (const [key, value] of [
    ["window", window],
    ["document", window.document],
    ["navigator", window.navigator],
    ["HTMLElement", window.HTMLElement],
  ] as const) {
    Object.defineProperty(globalThis, key, { value, writable: true, configurable: true });
  }
  const React = await import("react");
  const { act, render, waitFor, cleanup } = await import("@testing-library/react");
  const { createHttpClient } = await import("../../src/client/http.js");
  const { createAuthApi } = await import("../../src/client/auth-api.js");
  const { createOrdersApi } = await import("../../src/client/orders-api.js");
  const { createSessionStore } = await import("../../src/client/session-store.js");
  const { createOrdersStore } = await import("../../src/client/orders-store.js");
  const { createOrderDraftStore } = await import("../../src/orders/order-draft.js");
  const { App } = await import("../../src/router/App.js");

  let cookie = "";
  const browserFetch = (async (input: string | URL | Request, init: RequestInit = {}) => {
    const headers = new Headers(init.headers ?? {});
    if ((init.method ?? "GET") !== "GET") headers.set("Origin", base);
    if (cookie) headers.set("Cookie", cookie);
    const r = await fetch(`${base}${String(input)}`, { ...init, headers });
    const set = r.headers.get("Set-Cookie");
    if (set) cookie = /Max-Age=0/.test(set) ? "" : (set.split(";")[0] ?? "");
    return r;
  }) as typeof fetch;
  const http = createHttpClient({ fetch: browserFetch });
  const auth = createAuthApi(http);
  check(
    (await auth.signIn({ email: "owner@wiring.test", password: "correct-horse-1" })).ok,
    "App sign-in",
  );

  const go = async (path: string): Promise<void> => {
    await act(async () => {
      window.location.hash = path;
      window.dispatchEvent(new window.HashChangeEvent("hashchange"));
    });
  };
  await go("/orders");
  const view = render(
    React.createElement(App, {
      deps: {
        http,
        auth,
        orders: createOrdersApi(http),
        sessions: createSessionStore(),
        ordersStore: createOrdersStore(),
        draft: createOrderDraftStore(),
      },
    }),
  );
  const expectations: ReadonlyArray<readonly [string, string]> = [
    ["/orders", "orders-table"],
    ["/orders/new", "manual-order-form"],
    ["/orders/new/paste-parse", "paste-box"],
    ["/orders/new/repeat", "repeat-orders"],
    [`/orders/${orderId}`, "order-detail-header"],
    [`/orders/${orderId}/transition`, "order-detail-actions"],
    ["/lock", "lock-sheet"],
    ["/nowhere", "not-found-home"],
  ];
  const until = async (what: string, probe: () => boolean): Promise<void> => {
    try {
      await waitFor(
        () => {
          if (!probe()) throw new Error("not yet");
        },
        { timeout: 3_000 },
      );
    } catch {
      throw new CheckFailed(what);
    }
  };
  for (const [path, testId] of expectations) {
    await go(path);
    await until(
      `the App did not render ${testId} at #${path}`,
      () => view.queryByTestId(testId) !== null,
    );
  }
  // U2 (AC5.2a.2 widened, AC1.7.1): every screen row of the role table, as the Owner.
  const ENTRY = new Set(["/", "/sign-in", "/sign-up"]);
  let screens = 0;
  for (const row of SCREEN_ROWS) {
    if (row.allowed !== "public" && !isAllowed(row.allowed, "owner")) continue;
    const path = row.path.replace(":id", orderId);
    await go(path);
    if (ENTRY.has(row.path)) {
      await until(
        `a signed-in Owner at #${path} did not go on to #/orders`,
        () => window.location.hash === "#/orders",
      );
    } else {
      const heading = row.path.includes(":id") ? orderNo : row.heading;
      await until(
        `#${path}: ${row.headingTestId} is not "${heading}"`,
        () => view.queryByTestId(row.headingTestId)?.textContent === heading,
      );
      check(view.queryByTestId("error-banner") === null, `#${path} shows an error banner`);
    }
    screens += 1;
  }
  const email = view.queryByTestId("user-email")?.textContent;
  check(email === "owner@wiring.test", `the header shows ${email ?? "no email"}`);
  cleanup();
  return expectations.length + screens;
};

if (import.meta.main) {
  main().catch((e: unknown) => {
    process.stderr.write(`wiring-check FAILED: ${e instanceof Error ? e.message : String(e)}\n`);
    process.exit(1);
  });
}
