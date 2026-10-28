/**
 * tests/perf/order-api.bench.ts — `bun run bench [--profile=large]`: API latency on a real
 * Postgres (NFR6.1–NFR6.3; BR6.9; AC2.1a.6; cicd-pipeline.md gate 15).
 *
 * Method (performance-requirements.md, restated): a fresh database on the REALDB server,
 * migrated; the real server (`startServer`) on a free loopback port as the app login; one
 * Owner signed up over HTTP; 1 000 orders (`base`) or 10 000 (`large`) with 1–5 lines each,
 * seeded through `createOrder` with a distinct millisecond each, so keyset paging is exact.
 * Every U1 route except sign-in and sign-up gets 10 warm-up calls, then 100 sequential timed
 * calls; the targets are constants here and are never relaxed (the `CI` variable is not read):
 *   NFR6.1  p95 ≤ 300 ms per route;
 *   NFR6.2  session resolve: `GET /api/session` p95 ≤ 20 ms;
 *   NFR6.3  sign-in: the max of 10 calls ≤ 1.5 s (argon2id); sign-up, which can only succeed
 *           once per database, is the one timed sign-up;
 *   NFR6.8  5 signed-in clients in parallel, 50 calls each: zero errors, p95 still ≤ 300 ms;
 *   NFR6.9  (`large`) 10 % of the 10 000 orders carry 10 line revisions, and the first and a
 *           cursor page still meet NFR6.1.
 * U2 (P9, D-10, I-04; NFR6.13, NFR6.17): `GET /api/audit`, first page and a cursor page
 * (limit 50), p95 ≤ 300 ms each, after seeding audit rows straight into `audit_log` with the
 * admin login: `base` adds 2 000 rows for the business (the small default check); `large`
 * adds 20 000 for the business spread over 2 years, 2 000 for a second business and 1 000
 * past retention, runs `ANALYZE audit_log`, and asserts that the `EXPLAIN` plan of both
 * page queries names `audit_log_business_keyset_idx` (migration 0016).
 * U3 (P15–P17; NFR6.19–NFR6.21): with 20 members and 50 pending invitations seeded,
 * `GET /api/staff`, `POST /api/staff/invitations`, `POST /api/staff/:userId/reset-links` and
 * `POST /api/auth/recover` join the timed routes (p95 ≤ 300 ms); 10 accepts and 10 resets with
 * real tokens are timed one by one (max ≤ 1.5 s, one argon2 hash each); 10 unknown-token
 * accepts answer 410 with p95 ≤ 50 ms, and the same 10 through the domain function make zero
 * hash-gate calls (a spy); recover's median for a known and an unknown email over 50 calls
 * each is printed, report-only (NFR6.21 revised: the structural test is the gate).
 * Prints p50/p95/max per route and one result line; exits 1 when any target is missed.
 */
import postgres from "postgres";
import { acceptInvitation } from "../../src/auth/accept-invite.js";
import { createHashGate, type HashGate } from "../../src/auth/hash-gate.js";
import { insertSession } from "../../src/auth/session.js";
import { resetTestClock, setTestClock } from "../../src/data/clock.js";
import type { Uuid } from "../../src/data/uuid.js";
import { createPool } from "../../src/db/client.js";
import { runMigrations } from "../../src/db/migrate.js";
import { createOrder } from "../../src/orders/create-order.js";
import { transitionStatus } from "../../src/orders/transition-status.js";
import { updateOrder } from "../../src/orders/update-order.js";
import type { CreateOrderInput, OrderContext } from "../../src/orders/types.js";
import { readConfig } from "../../src/server/config.js";
import { startServer } from "../../src/server/main.js";

export const ROUTE_P95_MS = 300;
export const SESSION_P95_MS = 20;
export const SIGN_IN_MAX_MS = 1_500;
/** U3 (NFR6.20, F-01): an unknown token is refused without hashing. */
export const UNKNOWN_TOKEN_P95_MS = 50;
const STAFF_MEMBERS = 20;
const STAFF_INVITATIONS = 50;
const TOKEN_RUNS = 10;
const RECOVER_RUNS = 50;
const WARMUP = 10;
const SAMPLES = 100;
const CONCURRENT_CLIENTS = 5;
const CALLS_PER_CLIENT = 50;

const ADMIN = process.env["REALDB_ADMIN_URL"];
const APP = process.env["REALDB_APP_URL"];
const large = process.argv.includes("--profile=large");
const ORDERS = large ? 10_000 : 1_000;
/** U2 (NFR6.13, D-10): audit rows seeded for the business, a second business, past retention. */
const AUDIT_ROWS = large ? 20_000 : 2_000;
const AUDIT_FOREIGN = large ? 2_000 : 0;
const AUDIT_EXPIRED = large ? 1_000 : 0;
export const AUDIT_INDEX = "audit_log_business_keyset_idx";

/** Seed `count` audit rows in one statement (admin login; FK triggers off for a foreign id). */
const seedAudit = async (
  admin: postgres.Sql,
  opts: {
    readonly businessId: string;
    readonly actor: string | null;
    readonly count: number;
    readonly expired: boolean;
    readonly foreign: boolean;
  },
): Promise<void> => {
  if (opts.count === 0) return;
  // Spread over 2 years before the bench start; expired rows are 6 years old with retention gone.
  const start = opts.expired ? "2020-01-01T00:00:00Z" : "2024-01-01T00:00:00Z";
  const step = Math.max(1, Math.floor((2 * 365 * 24 * 3600) / opts.count));
  await admin.begin(async (tx) => {
    if (opts.foreign) await tx`SET LOCAL session_replication_role = replica`;
    await tx`
      INSERT INTO audit_log (id, business_id, actor_user_id, correlation_id, action,
                             subject_kind, subject_id, payload, reverses_id,
                             occurred_at, retention_until)
      SELECT gen_random_uuid(), ${opts.businessId}::uuid, ${opts.actor}::uuid,
             'bench' || g, 'order.update', 'order', NULL, '{}'::jsonb, NULL,
             ${start}::timestamptz + (g * ${step}) * interval '1 second' + (g % 1000) * interval '1 millisecond',
             CASE WHEN ${opts.expired} THEN now() - interval '1 day'
                  ELSE ${start}::timestamptz + (g * ${step}) * interval '1 second' + interval '5 years' END
      FROM generate_series(1, ${opts.count}) AS g
    `;
  });
};

const say = (line: string): void => {
  process.stdout.write(`${line}\n`);
};

const withDb = (url: string, db: string): string => {
  const u = new URL(url);
  u.pathname = `/${db}`;
  return u.toString();
};

export const percentile = (values: ReadonlyArray<number>, p: number): number => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)] ?? 0;
};

const orderInput = (i: number): CreateOrderInput => ({
  source: "manual",
  customerId: null,
  contact: { name: `ক্রেতা ${i}`, phone: null, address: null },
  repeatOfOrderId: null,
  items: Array.from({ length: (i % 5) + 1 }, (_, n) => ({
    variantId: null,
    description: `পণ্য ${i}-${n + 1}`,
    quantity: (n % 3) + 1,
    unitPricePaise: 10_000 + n * 2_500,
    lineDiscountPaise: 0,
  })),
  orderDiscountPaise: 0,
  deliveryChargePaise: 6_000,
});

const freePort = (): number => {
  const probe = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch: () => new Response() });
  const port = probe.port ?? 0;
  void probe.stop(true);
  return port;
};

const main = async (): Promise<void> => {
  if (!ADMIN || !APP) {
    process.stderr.write("bench: REALDB_ADMIN_URL and REALDB_APP_URL must be set\n");
    process.exit(1);
  }
  const dbName = `bench_${crypto.randomUUID().slice(0, 8)}`;
  const s0 = postgres(ADMIN, { max: 1, onnotice: () => undefined });
  await s0.unsafe(`CREATE DATABASE "${dbName}"`);
  await s0.end({ timeout: 5 });
  await runMigrations(withDb(ADMIN, dbName), () => undefined);
  const appUrl = withDb(APP, dbName);
  const port = freePort();
  const config = readConfig({ PORT: String(port), DATABASE_URL: appUrl });
  if (!config.ok) throw new Error(config.error);
  const server = await startServer(config.value, { distDir: null });
  const seedSql = createPool(appUrl);
  const base = `http://127.0.0.1:${port}`;
  const write = { Origin: base, "Content-Type": "application/json" };
  const misses: string[] = [];
  try {
    const t0 = performance.now();
    const up = await fetch(`${base}/api/auth/sign-up`, {
      method: "POST",
      headers: write,
      body: JSON.stringify({
        businessName: "Bench",
        email: "owner@bench.test",
        password: "correct-horse-1",
      }),
    });
    const signUpMs = Math.round(performance.now() - t0);
    if (up.status !== 201) throw new Error(`sign-up answered ${up.status}`);
    const session = (await up.json()) as { user: { id: Uuid }; businessId: Uuid };
    const cookie = (up.headers.get("Set-Cookie") ?? "").split(";")[0] ?? "";
    const ctx: OrderContext = {
      businessId: session.businessId,
      actorUserId: session.user.id,
      role: "owner",
    };

    // Seed: one distinct millisecond per order, so the keyset order is exact.
    const seedStart = Date.UTC(2026, 0, 1);
    for (let i = 0; i < ORDERS; i++) {
      setTestClock(new Date(seedStart + i));
      const r = await createOrder(seedSql, ctx, orderInput(i));
      if (!r.ok) throw new Error(`seed ${i}: ${r.error.kind}`);
      // NFR6.9 (large): 10 % of orders carry 10 line revisions (9 edits after creation).
      if (large && i % 10 === 0) {
        for (let rev = 2; rev <= 10; rev++) {
          const edited = await updateOrder(seedSql, ctx, r.value.id, {
            items: orderInput(i + rev).items,
          });
          if (!edited.ok) throw new Error(`seed revision ${i}/${rev}: ${edited.error.kind}`);
        }
      }
    }
    resetTestClock();
    // Fresh orders for the write routes, each in a status its route accepts.
    const fresh: string[] = [];
    for (let i = 0; i < (WARMUP + SAMPLES) * 3; i++) {
      const r = await createOrder(seedSql, ctx, orderInput(i));
      if (!r.ok) throw new Error("seed fresh");
      fresh.push(r.value.id);
    }
    const packed = fresh.slice(2 * (WARMUP + SAMPLES));
    for (const id of packed) {
      for (const to of ["confirmed", "packed"] as const)
        await transitionStatus(seedSql, ctx, id, to);
    }
    const firstPage = (await (
      await fetch(`${base}/api/orders`, { headers: { Cookie: cookie } })
    ).json()) as {
      orders: Array<{ id: string }>;
      nextCursor: string;
    };
    const anyId = firstPage.orders[0]?.id ?? "";

    // U2 (P9): the audit trail at this profile's size, then its first page's cursor.
    const admin = postgres(withDb(ADMIN, dbName), { max: 1, onnotice: () => undefined });
    try {
      const mine = { businessId: session.businessId, actor: session.user.id };
      await seedAudit(admin, { ...mine, count: AUDIT_ROWS, expired: false, foreign: false });
      await seedAudit(admin, { ...mine, count: AUDIT_EXPIRED, expired: true, foreign: false });
      await seedAudit(admin, {
        businessId: crypto.randomUUID(),
        actor: null,
        count: AUDIT_FOREIGN,
        expired: false,
        foreign: true,
      });
      if (large) {
        await admin`ANALYZE audit_log`;
        const nowIso = new Date().toISOString();
        const plans: string[] = [];
        for (const cursorAt of [null, "2025-01-01T00:00:00.000Z"]) {
          const cursorId = cursorAt === null ? null : "ffffffff-ffff-4fff-bfff-ffffffffffff";
          // The same statement as src/audit/audit-read.ts, under EXPLAIN (I-04).
          const rows = await admin<{ "QUERY PLAN": string }[]>`
            EXPLAIN SELECT a.id, a.occurred_at, a.action, a.subject_kind, a.subject_id,
                   a.correlation_id, a.reverses_id, u.email AS actor_email
            FROM audit_log a
            LEFT JOIN users u ON u.id = a.actor_user_id
            WHERE a.business_id = ${session.businessId}
              AND a.retention_until > ${nowIso}::timestamptz
              AND (${cursorAt}::timestamptz IS NULL OR (a.occurred_at, a.id) < (${cursorAt}::timestamptz, ${cursorId}::uuid))
            ORDER BY a.occurred_at DESC, a.id DESC
            LIMIT ${51}
          `;
          plans.push(rows.map((r) => r["QUERY PLAN"]).join("\n"));
        }
        const usesIndex = plans.every((p) => p.includes(AUDIT_INDEX));
        say(
          `EXPLAIN audit page (first, cursor): ${usesIndex ? AUDIT_INDEX : "NOT the keyset index"}`,
        );
        if (!usesIndex)
          misses.push(`the audit page plan does not use ${AUDIT_INDEX}:\n${plans.join("\n---\n")}`);
      }
    } finally {
      await admin.end({ timeout: 5 });
    }
    const auditFirst = (await (
      await fetch(`${base}/api/audit`, { headers: { Cookie: cookie } })
    ).json()) as { entries: unknown[]; nextCursor: string | null };
    if (auditFirst.entries.length !== 50 || auditFirst.nextCursor === null) {
      throw new Error("the audit trail did not answer a full first page");
    }
    const auditCursor = auditFirst.nextCursor;

    // U3 (P15): 20 members and 50 pending invitations, seeded with the admin login.
    const members: string[] = [];
    const seeder = postgres(withDb(ADMIN, dbName), { max: 1, onnotice: () => undefined });
    try {
      for (let m = 0; m < STAFF_MEMBERS; m++) {
        const id = crypto.randomUUID();
        members.push(id);
        await seeder`
          INSERT INTO users (id, business_id, email, password_hash, role, active, locale)
          VALUES (${id}, ${session.businessId}, ${`member${m}@bench.test`}, 'x',
                  ${m % 2 === 0 ? "sales_staff" : "accountant"}, true, 'bn')
        `;
      }
      for (let n = 0; n < STAFF_INVITATIONS; n++) {
        await seeder`
          INSERT INTO invitations (id, business_id, email, role, accept_token_hash, expires_at, created_by)
          VALUES (gen_random_uuid(), ${session.businessId}, ${`pending${n}@bench.test`}, 'accountant',
                  ${`bench-hash-${n}`}, now() + interval '7 days', ${session.user.id})
        `;
      }
    } finally {
      await seeder.end({ timeout: 5 });
    }
    const resetTarget = members[0] ?? "";

    let k = 0;
    const timed: Array<{ route: string; make: (i: number) => Promise<Response> }> = [
      { route: "GET /api/health", make: () => fetch(`${base}/api/health`) },
      { route: "GET /api/setup", make: () => fetch(`${base}/api/setup`) },
      {
        route: "GET /api/session",
        make: () => fetch(`${base}/api/session`, { headers: { Cookie: cookie } }),
      },
      {
        route: "GET /api/orders",
        make: () => fetch(`${base}/api/orders`, { headers: { Cookie: cookie } }),
      },
      {
        route: "GET /api/orders (cursor page)",
        make: () =>
          fetch(`${base}/api/orders?cursor=${encodeURIComponent(firstPage.nextCursor)}`, {
            headers: { Cookie: cookie },
          }),
      },
      {
        route: "GET /api/orders/:id",
        make: () => fetch(`${base}/api/orders/${anyId}`, { headers: { Cookie: cookie } }),
      },
      // U2 (NFR6.13): the audit trail's first page and a cursor page, limit 50.
      {
        route: "GET /api/audit",
        make: () => fetch(`${base}/api/audit`, { headers: { Cookie: cookie } }),
      },
      {
        route: "GET /api/audit (cursor page)",
        make: () =>
          fetch(`${base}/api/audit?cursor=${encodeURIComponent(auditCursor)}`, {
            headers: { Cookie: cookie },
          }),
      },
      {
        route: "POST /api/orders",
        make: (i) =>
          fetch(`${base}/api/orders`, {
            method: "POST",
            headers: { ...write, Cookie: cookie },
            body: JSON.stringify(orderInput(i)),
          }),
      },
      {
        route: "PATCH /api/orders/:id",
        make: (i) =>
          fetch(`${base}/api/orders/${fresh[i] ?? ""}`, {
            method: "PATCH",
            headers: { ...write, Cookie: cookie },
            body: JSON.stringify({ deliveryChargePaise: 5_000 + i }),
          }),
      },
      {
        route: "POST /api/orders/:id/status",
        make: (i) =>
          fetch(`${base}/api/orders/${fresh[WARMUP + SAMPLES + i] ?? ""}/status`, {
            method: "POST",
            headers: { ...write, Cookie: cookie },
            body: JSON.stringify({ to: "confirmed" }),
          }),
      },
      {
        route: "POST /api/orders/:id/consignment",
        make: (i) =>
          fetch(`${base}/api/orders/${packed[i] ?? ""}/consignment`, {
            method: "POST",
            headers: { ...write, Cookie: cookie },
            body: JSON.stringify({ consignmentRef: `PT-${1000 + i}` }),
          }),
      },
      // U3 (P15; NFR6.19): the staff routes and recover.
      {
        route: "GET /api/staff",
        make: () => fetch(`${base}/api/staff`, { headers: { Cookie: cookie } }),
      },
      {
        route: "POST /api/staff/invitations",
        make: (i) =>
          fetch(`${base}/api/staff/invitations`, {
            method: "POST",
            headers: { ...write, Cookie: cookie },
            body: JSON.stringify({ email: `timed${i}@bench.test`, role: "sales_staff" }),
          }),
      },
      {
        route: "POST /api/staff/:userId/reset-links",
        make: () =>
          fetch(`${base}/api/staff/${resetTarget}/reset-links`, {
            method: "POST",
            headers: { ...write, Cookie: cookie },
            body: "{}",
          }),
      },
      {
        route: "POST /api/auth/recover",
        make: (i) =>
          fetch(`${base}/api/auth/recover`, {
            method: "POST",
            headers: write,
            body: JSON.stringify({
              email: i % 2 === 0 ? "owner@bench.test" : `nobody${i}@bench.test`,
            }),
          }),
      },
      {
        route: "POST /api/auth/sign-out",
        make: async () => {
          const s = await insertSession(seedSql, {
            userId: session.user.id,
            businessId: session.businessId,
            at: new Date(),
          });
          return fetch(`${base}/api/auth/sign-out`, {
            method: "POST",
            headers: { ...write, Cookie: `__Host-sb_session=${s.token}` },
            body: "{}",
          });
        },
      },
    ];
    say(
      `profile ${large ? "large" : "base"}: ${ORDERS} orders; audit +${AUDIT_ROWS} rows (+${AUDIT_FOREIGN} foreign, +${AUDIT_EXPIRED} expired); ${SAMPLES} timed calls per route after ${WARMUP} warm-up`,
    );
    say("route | p50 ms | p95 ms | max ms");
    for (const t of timed) {
      const ms: number[] = [];
      for (let i = 0; i < WARMUP + SAMPLES; i++) {
        const started = performance.now();
        const r = await t.make(i);
        const elapsed = performance.now() - started;
        await r.arrayBuffer();
        if (r.status >= 400) throw new Error(`${t.route} answered ${r.status} on call ${i}`);
        if (i >= WARMUP) ms.push(elapsed);
        k += 1;
      }
      const p95 = percentile(ms, 95);
      say(
        `${t.route} | ${percentile(ms, 50).toFixed(1)} | ${p95.toFixed(1)} | ${Math.max(...ms).toFixed(1)}`,
      );
      const limit = t.route === "GET /api/session" ? SESSION_P95_MS : ROUTE_P95_MS;
      if (p95 > limit) misses.push(`${t.route} p95 ${p95.toFixed(1)} ms > ${limit} ms`);
    }

    // NFR6.8: 5 signed-in clients at once, 50 calls each (list and detail), on the pool of 5;
    // zero errors and the NFR6.1 p95 still met.
    const clients = await Promise.all(
      Array.from({ length: CONCURRENT_CLIENTS }, () =>
        insertSession(seedSql, {
          userId: session.user.id,
          businessId: session.businessId,
          at: new Date(),
        }),
      ),
    );
    const parallelMs: number[] = [];
    let parallelErrors = 0;
    await Promise.all(
      clients.map(async (c) => {
        for (let i = 0; i < CALLS_PER_CLIENT; i++) {
          const url = i % 2 === 0 ? `${base}/api/orders` : `${base}/api/orders/${anyId}`;
          const started = performance.now();
          const r = await fetch(url, { headers: { Cookie: `__Host-sb_session=${c.token}` } });
          await r.arrayBuffer();
          parallelMs.push(performance.now() - started);
          if (r.status !== 200) parallelErrors += 1;
        }
      }),
    );
    const parallelP95 = percentile(parallelMs, 95);
    say(
      `${CONCURRENT_CLIENTS} parallel clients × ${CALLS_PER_CLIENT} calls | p95 ${parallelP95.toFixed(1)} ms | errors ${parallelErrors}`,
    );
    if (parallelErrors > 0)
      misses.push(`${parallelErrors} errors with ${CONCURRENT_CLIENTS} parallel clients`);
    if (parallelP95 > ROUTE_P95_MS) {
      misses.push(`parallel p95 ${parallelP95.toFixed(1)} ms > ${ROUTE_P95_MS} ms`);
    }

    const signIns: number[] = [];
    for (let i = 0; i < 10; i++) {
      const started = performance.now();
      const r = await fetch(`${base}/api/auth/sign-in`, {
        method: "POST",
        headers: write,
        body: JSON.stringify({ email: "owner@bench.test", password: "correct-horse-1" }),
      });
      await r.arrayBuffer();
      if (r.status !== 200) throw new Error(`sign-in answered ${r.status}`);
      signIns.push(performance.now() - started);
    }
    const signInMax = Math.max(...signIns);
    say(`POST /api/auth/sign-in | max of 10: ${signInMax.toFixed(0)} ms; sign-up: ${signUpMs} ms`);
    if (signInMax > SIGN_IN_MAX_MS)
      misses.push(`sign-in max ${signInMax.toFixed(0)} ms > ${SIGN_IN_MAX_MS} ms`);
    if (signUpMs > SIGN_IN_MAX_MS) misses.push(`sign-up ${signUpMs} ms > ${SIGN_IN_MAX_MS} ms`);

    // U3 (P16; NFR6.20): 10 accepts and 10 resets with real tokens, one argon2 hash each.
    const tokenOf = async (r: Response): Promise<string> => {
      const link = ((await r.json()) as { link: string }).link;
      return /[?&]t=([A-Za-z0-9_-]{43})$/.exec(link)?.[1] ?? "";
    };
    const timeOne = async (path: string, body: unknown, want: number): Promise<number> => {
      const started = performance.now();
      const r = await fetch(`${base}${path}`, {
        method: "POST",
        headers: write,
        body: JSON.stringify(body),
      });
      await r.arrayBuffer();
      if (r.status !== want) throw new Error(`${path} answered ${r.status}`);
      return performance.now() - started;
    };
    const accepts: number[] = [];
    const resets: number[] = [];
    for (let i = 0; i < TOKEN_RUNS; i++) {
      const invited = await fetch(`${base}/api/staff/invitations`, {
        method: "POST",
        headers: { ...write, Cookie: cookie },
        body: JSON.stringify({ email: `accept${i}@bench.test`, role: "accountant" }),
      });
      const t = await tokenOf(invited);
      accepts.push(
        await timeOne("/api/invitations/accept", { token: t, password: "correct-horse-7" }, 201),
      );
      const linked = await fetch(`${base}/api/staff/${members[1] ?? ""}/reset-links`, {
        method: "POST",
        headers: { ...write, Cookie: cookie },
        body: "{}",
      });
      const r = await tokenOf(linked);
      resets.push(await timeOne("/api/auth/reset", { token: r, password: "correct-horse-8" }, 204));
    }
    const acceptMax = Math.max(...accepts);
    const resetMax = Math.max(...resets);
    say(
      `POST /api/invitations/accept | max of ${TOKEN_RUNS}: ${acceptMax.toFixed(0)} ms; POST /api/auth/reset | max of ${TOKEN_RUNS}: ${resetMax.toFixed(0)} ms`,
    );
    if (acceptMax > SIGN_IN_MAX_MS)
      misses.push(`accept max ${acceptMax.toFixed(0)} ms > ${SIGN_IN_MAX_MS} ms`);
    if (resetMax > SIGN_IN_MAX_MS)
      misses.push(`reset max ${resetMax.toFixed(0)} ms > ${SIGN_IN_MAX_MS} ms`);

    // U3 (F-01; NFR6.20): unknown tokens are refused fast and without any hashing.
    const unknown: number[] = [];
    for (let i = 0; i < TOKEN_RUNS; i++) {
      const fake = `UnknownBenchToken${String(i).padStart(2, "0")}`.padEnd(43, "x");
      unknown.push(
        await timeOne("/api/invitations/accept", { token: fake, password: "correct-horse-7" }, 410),
      );
    }
    const unknownP95 = percentile(unknown, 95);
    let gateCalls = 0;
    const inner = createHashGate();
    const spy: HashGate = {
      run: (work) => {
        gateCalls += 1;
        return inner.run(work);
      },
      inFlight: inner.inFlight,
      waiting: inner.waiting,
    };
    for (let i = 0; i < TOKEN_RUNS; i++) {
      const fake = `UnknownBenchToken${String(i).padStart(2, "0")}`.padEnd(43, "x");
      const r = await acceptInvitation(
        seedSql,
        { token: fake, password: "correct-horse-7", presentedToken: null, now: new Date() },
        { hashGate: spy },
      );
      if (r.ok || r.error.kind !== "gone") throw new Error("an unknown token was not gone");
    }
    say(
      `unknown token | p95 of ${TOKEN_RUNS}: ${unknownP95.toFixed(1)} ms over HTTP; hash-gate calls: ${gateCalls}`,
    );
    if (unknownP95 > UNKNOWN_TOKEN_P95_MS)
      misses.push(`unknown token p95 ${unknownP95.toFixed(1)} ms > ${UNKNOWN_TOKEN_P95_MS} ms`);
    if (gateCalls !== 0) misses.push(`an unknown token reached the hash gate ${gateCalls} times`);

    // U3 (P17; NFR6.21 revised): recover timing parity, printed only.
    const recoverMs = async (email: (i: number) => string): Promise<number[]> => {
      const out: number[] = [];
      for (let i = 0; i < RECOVER_RUNS; i++)
        out.push(await timeOne("/api/auth/recover", { email: email(i) }, 202));
      return out;
    };
    const known = percentile(await recoverMs(() => "owner@bench.test"), 50);
    const unknownEmail = percentile(await recoverMs((i) => `nobody${i}@bench.test`), 50);
    say(
      `POST /api/auth/recover | median known ${known.toFixed(1)} ms, unknown ${unknownEmail.toFixed(1)} ms, difference ${Math.abs(known - unknownEmail).toFixed(1)} ms (report-only)`,
    );

    if (misses.length > 0) {
      process.stderr.write(`bench FAILED: ${misses.join("; ")}\n`);
      process.exitCode = 1;
    } else {
      say(
        `bench ok (${large ? "large" : "base"}): ${k} timed+warm-up calls, every target met; sign-in max ${signInMax.toFixed(0)} ms`,
      );
    }
  } finally {
    await seedSql.end({ timeout: 5 });
    await server.stop();
    const s = postgres(ADMIN, { max: 1, onnotice: () => undefined });
    await s.unsafe(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`);
    await s.end({ timeout: 5 });
  }
};

if (import.meta.main) {
  main().catch((e: unknown) => {
    process.stderr.write(`bench FAILED: ${e instanceof Error ? e.message : String(e)}\n`);
    process.exit(1);
  });
}
