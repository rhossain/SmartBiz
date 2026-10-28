/**
 * tests/realdb/staff.realdb.test.ts — invitations, accept, reset links and resets on a real
 * Postgres, as the app login (U3 R12–R14; NFR3.16, NFR3.21, NFR3.22, NFR7.15–NFR7.18;
 * review N-01, P-01, P-02, D-03, E-01).
 *
 * Only a real database shows row locks, waits, foreign-key share locks and rollback of a
 * half-done transaction, so these run here (the stub records only the statement order):
 *   - atomicity (NFR7.15, R12): a failure injected after the audit insert, through a wrapped
 *     `Sql`, leaves neither the audit row nor the change, and the token unused — for all
 *     four write paths;
 *   - single use under a forced race (NFR7.16, P-01): request B pauses INSIDE its transaction
 *     through `deps.hooks.afterLock`, holding its locks; request A, which passed the unlocked
 *     lookup, is seen blocked in `pg_stat_activity`; a third session cannot lock B's token
 *     row (`FOR UPDATE NOWAIT` → 55P03), which is what proves the token row itself is locked;
 *     B commits; A answers `gone` with nothing written. The same for accept and for reset;
 *   - two invites for one email while the business row is held (NFR7.17, F-02): both wait,
 *     and after release exactly one invitation is pending;
 *   - invite against accept of the invitation it supersedes, both orders (D-03), and an
 *     invite by a Manager against a reset of that Manager, both orders (E-01): no 500, one
 *     consistent outcome each;
 *   - lock order users → resets (NFR7.18): with the target's users row held elsewhere, the
 *     waiting reset holds no lock on the reset rows yet (NOWAIT on them succeeds);
 *   - a completed reset deletes every session of the user and closes the user's other open
 *     resets (NFR3.21); a new link closes the earlier one (NFR3.22);
 *   - a deadlock injected twice answers `gone` with nothing written; once, it succeeds;
 *   - only the token's SHA-256 is stored, never the token (NFR3.16);
 *   - review G-01: a sign-in that verified the old password and pauses before its session
 *     transaction, while a reset commits, answers 401 and leaves no session (NFR3.21);
 *   - review G-03: an email that became a user after the invite makes accept 409
 *     `email_taken` from real Postgres's unique index, the invitation unused (NFR7.21);
 *   - review G-04: `listStaff`'s query on Postgres — role order, used and expired invitations
 *     filtered, 200 rows and `truncated` (NFR6.22).
 * Every case gets its own fresh database. Database URLs come from the realdb environment.
 */
import { afterAll, describe, expect, setDefaultTimeout, test } from "bun:test";
import type postgres from "postgres";
import { acceptInvitation } from "../../src/auth/accept-invite.js";
import { createHashGate } from "../../src/auth/hash-gate.js";
import { createInvitation, listStaff } from "../../src/auth/invite.js";
import { completeReset, createResetLink } from "../../src/auth/password-reset.js";
import { insertSession, resolveSession } from "../../src/auth/session.js";
import { sha256 } from "../../src/auth/sha256.js";
import { signUp } from "../../src/auth/sign-up.js";
import type { TxHooks } from "../../src/auth/types.js";
import type { Sql } from "../../src/db/client.js";
import type { Role } from "../../src/data/enums.js";
import type { Uuid } from "../../src/data/uuid.js";
import { authDeps } from "../helpers/auth-fixtures.js";
import { harness, request } from "../helpers/server-harness.js";
import { makeSqlStub } from "../helpers/sql-stub.js";
import { deferred, NEW_PASSWORD, tokenOf } from "../helpers/staff-fixtures.js";
import { freshDatabase, realdbEnabled, sqlState, type FreshDatabase } from "./fresh-database.js";

const MANAGER = "c2000000-0000-4000-8000-0000000000c2" as Uuid;
const SALES = "c3000000-0000-4000-8000-0000000000c3" as Uuid;
const WAIT_MS = 10_000;

const opened: FreshDatabase[] = [];

// Several cases migrate two fresh databases and hash with argon2; on a loaded machine that
// passes bun's 5 s default. This is a test time-out, not a quality target.
setDefaultTimeout(30_000);

interface World {
  readonly db: FreshDatabase;
  readonly businessId: Uuid;
  readonly owner: { readonly id: Uuid; readonly role: Role };
  readonly manager: { readonly id: Uuid; readonly role: Role };
}

/** A fresh database with the Owner (signed up), a Manager and a Sales Staff member. */
const world = async (label: string): Promise<World> => {
  const db = await freshDatabase(label);
  opened.push(db);
  const up = await signUp(
    db.app,
    { email: "owner@realdb.test", password: NEW_PASSWORD, businessName: "Acme", locale: "bn" },
    authDeps(),
  );
  if (!up.ok) throw new Error(`sign-up failed: ${up.error.kind}`);
  const businessId = up.value.businessId;
  for (const [id, email, role] of [
    [MANAGER, "manager@realdb.test", "manager"],
    [SALES, "sales@realdb.test", "sales_staff"],
  ] as const) {
    await db.admin`
      INSERT INTO users (id, business_id, email, password_hash, role, active, locale)
      VALUES (${id}, ${businessId}, ${email}, 'x', ${role}, true, 'bn')
    `;
  }
  return {
    db,
    businessId,
    owner: { id: up.value.user.id, role: "owner" },
    manager: { id: MANAGER, role: "manager" },
  };
};

const now = (): Date => new Date();

const invite = (w: World, email: string, by = w.owner, hooks?: TxHooks, sql: Sql = w.db.app) =>
  createInvitation(
    sql,
    { businessId: w.businessId, actor: by, email, role: "sales_staff", now: now(), port: 3000 },
    hooks ? { hooks } : {},
  );

const accept = (w: World, token: string, hooks?: TxHooks, sql: Sql = w.db.app) =>
  acceptInvitation(
    sql,
    { token, password: NEW_PASSWORD, presentedToken: null, now: now() },
    { hashGate: createHashGate(), ...(hooks ? { hooks } : {}) },
  );

const resetLink = (w: World, target: Uuid, sql: Sql = w.db.app) =>
  createResetLink(sql, {
    via: "staff",
    businessId: w.businessId,
    by: w.owner,
    targetUserId: target,
    now: now(),
    port: 3000,
  });

const reset = (w: World, token: string, hooks?: TxHooks, sql: Sql = w.db.app) =>
  completeReset(
    sql,
    { token, password: `${NEW_PASSWORD}-new`, now: now() },
    { hashGate: createHashGate(), ...(hooks ? { hooks } : {}) },
  );

const invitedToken = async (w: World, email: string): Promise<string> => {
  const r = await invite(w, email);
  if (!r.ok) throw new Error(`invite failed: ${r.error.kind}`);
  return tokenOf(r.value.link);
};

const linkToken = async (w: World, target: Uuid): Promise<string> => {
  const r = await resetLink(w, target);
  if (!r.ok) throw new Error(`reset link failed: ${r.error.kind}`);
  return tokenOf(r.value.link);
};

/** How many sessions of this database are waiting on a lock right now. */
const waiting = async (w: World): Promise<number> => {
  const [row] = await w.db.admin<{ n: number }[]>`
    SELECT count(*)::int AS n FROM pg_stat_activity
    WHERE datname = ${w.db.name} AND wait_event_type = 'Lock'
  `;
  return row?.n ?? 0;
};

const waitForWaiters = async (w: World, n: number): Promise<void> => {
  const deadline = performance.now() + WAIT_MS;
  while (performance.now() < deadline) {
    if ((await waiting(w)) >= n) return;
    await Bun.sleep(20);
  }
  throw new Error(`expected ${n} session(s) waiting on a lock; saw ${await waiting(w)}`);
};

/** A hook that reports "locks held" and then holds them until released. */
const pausing = () => {
  const reached = deferred();
  const release = deferred();
  const hooks: TxHooks = {
    afterLock: async () => {
      reached.resolve();
      await release.promise;
    },
  };
  return { hooks, reached: reached.promise, release: release.resolve };
};

/** Hold `FOR UPDATE` on rows from a separate admin session until released. */
const hold = async (w: World, lock: (tx: postgres.TransactionSql) => Promise<unknown>) => {
  const locked = deferred();
  const release = deferred();
  const done = w.db.admin.begin(async (tx) => {
    await lock(tx);
    locked.resolve();
    await release.promise;
  });
  await locked.promise;
  return {
    release: async () => {
      release.resolve();
      await done;
    },
  };
};

/**
 * The app login with one injected failure: the first statement matching `match` throws
 * `code` instead of running. Transactions run through the real `begin`, so Postgres rolls
 * back whatever came before the failure (R12).
 */
const faulty = (sql: Sql, match: RegExp, code = "XX000", times = 1): Sql => {
  let left = times;
  const wrap = (q: postgres.Sql | postgres.TransactionSql) =>
    ((strings: TemplateStringsArray, ...params: unknown[]) => {
      if (left > 0 && match.test(strings.join("?"))) {
        left -= 1;
        return Promise.reject(Object.assign(new Error(`injected ${code}`), { code }));
      }
      return (q as unknown as (s: TemplateStringsArray, ...p: unknown[]) => unknown)(
        strings,
        ...params,
      );
    }) as unknown as Sql;
  const top = wrap(sql) as unknown as Record<string, unknown>;
  top["begin"] = (fn: (tx: Sql) => Promise<unknown>) =>
    sql.begin((tx) => fn(wrap(tx)) as Promise<unknown>);
  return top as unknown as Sql;
};

const count = async (w: World, query: string): Promise<number> => {
  const [row] = await w.db.admin.unsafe<{ n: number }[]>(`SELECT (${query})::int AS n`);
  return row?.n ?? -1;
};

const auditCount = (w: World, action: string): Promise<number> =>
  count(w, `SELECT count(*) FROM audit_log WHERE action = '${action}'`);

describe.skipIf(!realdbEnabled)("staff flows on real Postgres (U3)", () => {
  afterAll(async () => {
    for (const db of opened) await db.drop();
  });

  test("atomic: a failure after the audit insert leaves nothing, token unused (NFR7.15)", async () => {
    const w = await world("atomic");
    // Invite: the invitation insert fails after auth.invite_created was written.
    await expect(
      invite(w, "new@realdb.test", w.owner, undefined, faulty(w.db.app, /INSERT INTO invitations/)),
    ).rejects.toMatchObject({ code: "XX000" });
    expect(await count(w, "SELECT count(*) FROM invitations")).toBe(0);
    expect(await auditCount(w, "auth.invite_created")).toBe(0);

    // Accept: the user insert fails after auth.invite_accepted was written.
    const token = await invitedToken(w, "new@realdb.test");
    await expect(
      accept(w, token, undefined, faulty(w.db.app, /INSERT INTO users/)),
    ).rejects.toMatchObject({ code: "XX000" });
    expect(await count(w, "SELECT count(*) FROM users WHERE email = 'new@realdb.test'")).toBe(0);
    expect(await count(w, "SELECT count(*) FROM invitations WHERE used_at IS NULL")).toBe(1);
    expect(await auditCount(w, "auth.invite_accepted")).toBe(0);
    expect((await accept(w, token)).ok).toBe(true);

    // Reset link: the insert fails after the audit row and the sibling close.
    const first = await linkToken(w, SALES);
    await expect(
      resetLink(w, SALES, faulty(w.db.app, /INSERT INTO password_resets/)),
    ).rejects.toMatchObject({ code: "XX000" });
    expect(await auditCount(w, "auth.reset_link_created")).toBe(1);
    expect(await count(w, "SELECT count(*) FROM password_resets WHERE used_at IS NULL")).toBe(1);

    // Reset: deleting the sessions fails after the audit row, the hash and the closes.
    const session = await insertSession(w.db.app, {
      userId: SALES,
      businessId: w.businessId,
      at: now(),
    });
    await expect(
      reset(w, first, undefined, faulty(w.db.app, /DELETE FROM sessions/)),
    ).rejects.toMatchObject({ code: "XX000" });
    expect(await auditCount(w, "auth.password_reset")).toBe(0);
    expect(
      await count(w, `SELECT count(*) FROM users WHERE id = '${SALES}' AND password_hash = 'x'`),
    ).toBe(1);
    expect(await resolveSession(w.db.app, session.token, now())).not.toBeNull();
    expect((await reset(w, first)).ok).toBe(true);
  });

  test("accept: single use under a forced race; B holds the token row (NFR7.16, P-01)", async () => {
    const w = await world("raceaccept");
    const token = await invitedToken(w, "race@realdb.test");
    const [inv] = await w.db.admin<{ id: string }[]>`SELECT id FROM invitations`;
    const b = pausing();
    const bResult = accept(w, token, b.hooks);
    await b.reached;
    // A passed the unlocked lookup (B has not committed) and now waits on B's locks.
    const aResult = accept(w, token);
    await waitForWaiters(w, 1);
    expect(
      await sqlState(
        () => w.db.admin`SELECT id FROM invitations WHERE id = ${inv?.id ?? ""} FOR UPDATE NOWAIT`,
      ),
    ).toBe("55P03");
    b.release();
    expect((await bResult).ok).toBe(true);
    expect(await aResult).toEqual({ ok: false, error: { kind: "gone" } });
    expect(await count(w, "SELECT count(*) FROM users WHERE email = 'race@realdb.test'")).toBe(1);
    expect(await auditCount(w, "auth.invite_accepted")).toBe(1);
  });

  test("reset: single use under a forced race; B holds the users and reset rows (NFR7.16, P-01)", async () => {
    const w = await world("racereset");
    const token = await linkToken(w, SALES);
    const [r] = await w.db.admin<{ id: string }[]>`SELECT id FROM password_resets`;
    const b = pausing();
    const bResult = reset(w, token, b.hooks);
    await b.reached;
    const aResult = reset(w, token);
    await waitForWaiters(w, 1);
    expect(
      await sqlState(() => w.db.admin`SELECT id FROM users WHERE id = ${SALES} FOR UPDATE NOWAIT`),
    ).toBe("55P03");
    expect(
      await sqlState(
        () =>
          w.db.admin`SELECT id FROM password_resets WHERE id = ${r?.id ?? ""} FOR UPDATE NOWAIT`,
      ),
    ).toBe("55P03");
    b.release();
    expect((await bResult).ok).toBe(true);
    expect(await aResult).toEqual({ ok: false, error: { kind: "gone" } });
    expect(await auditCount(w, "auth.password_reset")).toBe(1);
  });

  test("two invites for one email while the business row is held: one pending (NFR7.17)", async () => {
    const w = await world("supersede");
    const holder = await hold(w, (tx) => tx`SELECT id FROM businesses FOR UPDATE`);
    const both = Promise.all([invite(w, "dup@realdb.test"), invite(w, "DUP@realdb.test")]);
    await waitForWaiters(w, 2);
    await holder.release();
    const results = await both;
    expect(results.map((r) => r.ok)).toEqual([true, true]);
    expect(
      await count(
        w,
        "SELECT count(*) FROM invitations WHERE email = 'dup@realdb.test' AND used_at IS NULL",
      ),
    ).toBe(1);
    expect(await count(w, "SELECT count(*) FROM invitations WHERE email = 'dup@realdb.test'")).toBe(
      2,
    );
  });

  test("invite against accept of the invitation it supersedes, both orders: no 500 (D-03)", async () => {
    // Accept first: the invite then finds a member (409).
    const w1 = await world("invacc1");
    const t1 = await invitedToken(w1, "x@realdb.test");
    const a = pausing();
    const accepting = accept(w1, t1, a.hooks);
    await a.reached;
    const inviting = invite(w1, "x@realdb.test");
    await waitForWaiters(w1, 1);
    a.release();
    expect((await accepting).ok).toBe(true);
    expect(await inviting).toEqual({ ok: false, error: { kind: "conflict" } });

    // Invite first: it supersedes the invitation, and the accept then answers gone.
    const w2 = await world("invacc2");
    const t2 = await invitedToken(w2, "x@realdb.test");
    const i = pausing();
    const inviting2 = invite(w2, "x@realdb.test", w2.owner, i.hooks);
    await i.reached;
    const accepting2 = accept(w2, t2);
    await waitForWaiters(w2, 1);
    i.release();
    expect((await inviting2).ok).toBe(true);
    expect(await accepting2).toEqual({ ok: false, error: { kind: "gone" } });
    expect(await count(w2, "SELECT count(*) FROM users WHERE email = 'x@realdb.test'")).toBe(0);
  });

  test("an invite by a Manager against a reset of that Manager, both orders: both succeed (E-01)", async () => {
    for (const first of ["invite", "reset"] as const) {
      const w = await world(`mgr${first}`);
      const token = await linkToken(w, MANAGER);
      const p = pausing();
      const paused =
        first === "invite"
          ? invite(w, "m1@realdb.test", w.manager, p.hooks)
          : reset(w, token, p.hooks);
      await p.reached;
      const other = first === "invite" ? reset(w, token) : invite(w, "m1@realdb.test", w.manager);
      await waitForWaiters(w, 1);
      p.release();
      const results = await Promise.all([paused, other]);
      expect({ first, ok: results.map((r) => r.ok) }).toEqual({ first, ok: [true, true] });
    }
  });

  test("lock order users → resets: a reset waiting on the users row holds no reset row (NFR7.18)", async () => {
    const w = await world("lockorder");
    const token = await linkToken(w, SALES);
    const [r] = await w.db.admin<{ id: string }[]>`SELECT id FROM password_resets`;
    const holder = await hold(w, (tx) => tx`SELECT id FROM users WHERE id = ${SALES} FOR UPDATE`);
    const resetting = reset(w, token);
    await waitForWaiters(w, 1);
    expect(
      await sqlState(
        () =>
          w.db.admin`SELECT id FROM password_resets WHERE id = ${r?.id ?? ""} FOR UPDATE NOWAIT`,
      ),
    ).toBe("allowed");
    await holder.release();
    expect((await resetting).ok).toBe(true);
  });

  test("a reset deletes every session of the user and closes its other open resets (NFR3.21)", async () => {
    const w = await world("sessions");
    const token = await linkToken(w, SALES);
    const other = "other-open-reset-token";
    await w.db.admin`
      INSERT INTO password_resets (id, user_id, token_hash, expires_at)
      VALUES (gen_random_uuid(), ${SALES}, ${await sha256(other.padEnd(43, "x"))}, now() + interval '30 minutes')
    `;
    const s1 = await insertSession(w.db.app, {
      userId: SALES,
      businessId: w.businessId,
      at: now(),
    });
    const s2 = await insertSession(w.db.app, {
      userId: SALES,
      businessId: w.businessId,
      at: now(),
    });
    const ownerSession = await insertSession(w.db.app, {
      userId: w.owner.id,
      businessId: w.businessId,
      at: now(),
    });
    expect((await reset(w, token)).ok).toBe(true);
    expect(await resolveSession(w.db.app, s1.token, now())).toBeNull();
    expect(await resolveSession(w.db.app, s2.token, now())).toBeNull();
    expect(await resolveSession(w.db.app, ownerSession.token, now())).not.toBeNull();
    expect(await reset(w, other.padEnd(43, "x"))).toEqual({ ok: false, error: { kind: "gone" } });
    expect(
      await count(
        w,
        `SELECT count(*) FROM password_resets WHERE user_id = '${SALES}' AND used_at IS NULL`,
      ),
    ).toBe(0);
  });

  test("a new reset link closes the earlier one (NFR3.22)", async () => {
    const w = await world("siblings");
    const first = await linkToken(w, SALES);
    const second = await linkToken(w, SALES);
    expect(await reset(w, first)).toEqual({ ok: false, error: { kind: "gone" } });
    expect((await reset(w, second)).ok).toBe(true);
  });

  test("a deadlock twice answers gone with nothing written; once, it succeeds (NFR7.18)", async () => {
    const w = await world("deadlock");
    const token = await invitedToken(w, "dl@realdb.test");
    const twice = faulty(w.db.app, /FROM invitations WHERE id = \S+ FOR UPDATE/, "40P01", 2);
    expect(await accept(w, token, undefined, twice)).toEqual({
      ok: false,
      error: { kind: "gone" },
    });
    expect(await count(w, "SELECT count(*) FROM users WHERE email = 'dl@realdb.test'")).toBe(0);
    expect(await count(w, "SELECT count(*) FROM invitations WHERE used_at IS NULL")).toBe(1);
    const once = faulty(w.db.app, /FROM invitations WHERE id = \S+ FOR UPDATE/, "40P01", 1);
    expect((await accept(w, token, undefined, once)).ok).toBe(true);
  });

  test("only the SHA-256 of a token is stored, never the token (NFR3.16)", async () => {
    const w = await world("hashonly");
    const inviteToken = await invitedToken(w, "h@realdb.test");
    const resetToken = await linkToken(w, SALES);
    const [rows] = await w.db.admin<{ t: string }[]>`
      SELECT (SELECT string_agg(i::text, ' ') FROM invitations i) || ' ' ||
             (SELECT string_agg(r::text, ' ') FROM password_resets r) || ' ' ||
             (SELECT string_agg(a::text, ' ') FROM audit_log a) AS t
    `;
    const all = rows?.t ?? "";
    expect(all).toContain(await sha256(inviteToken));
    expect(all).toContain(await sha256(resetToken));
    for (const t of [inviteToken, resetToken]) expect(all.includes(t)).toBe(false);
    expect(all.includes("h@realdb.test")).toBe(true); // the invitation row keeps the email …
    const [audit] = await w.db.admin<
      { t: string }[]
    >`SELECT string_agg(payload::text, ' ') AS t FROM audit_log`;
    expect((audit?.t ?? "").includes("@")).toBe(false); // … the audit payloads never (BR8.1)
  });

  // ---------------------------------------------------------------- review fixes (G-01, G-03, G-04)

  test("a sign-in racing a reset cannot outlive it: 401 and no session (G-01, NFR3.21)", async () => {
    const w = await world("signinrace");
    const link = await createResetLink(w.db.app, {
      via: "terminal",
      by: null,
      email: "owner@realdb.test",
      now: now(),
      port: 3000,
    });
    if (!link.ok) throw new Error(link.error.kind);
    // Sign-in has verified the OLD password and pauses before its session transaction.
    const reached = deferred();
    const release = deferred();
    const h = harness(makeSqlStub(), {
      sql: w.db.app,
      clock: () => new Date(),
      hooks: {
        beforeTransaction: async () => {
          reached.resolve();
          await release.promise;
        },
      },
    });
    const signingIn = h.send(
      request("POST", "/api/auth/sign-in", {
        body: { email: "owner@realdb.test", password: NEW_PASSWORD },
      }),
    );
    await reached.promise;
    // The reset commits: new hash, every session of the Owner deleted.
    expect((await reset(w, tokenOf(link.value.link))).ok).toBe(true);
    release.resolve();
    const answer = await signingIn;
    expect([answer.status, await answer.text()]).toEqual([401, '{"error":"invalid_credentials"}']);
    expect(answer.headers.get("Set-Cookie")).toBeNull();
    expect(await count(w, `SELECT count(*) FROM sessions WHERE user_id = '${w.owner.id}'`)).toBe(0);
    expect(
      await count(
        w,
        "SELECT count(*) FROM audit_log WHERE action = 'auth.sign_in.failure' AND payload->>'reason' = 'bad_password'",
      ),
    ).toBe(1);
  });

  test("accept when the email became a user meanwhile: 409 email_taken, invitation unused (G-03)", async () => {
    const w = await world("emailrace");
    const token = await invitedToken(w, "late@realdb.test");
    // Created after the invite's member check, before accept: only the unique index sees it.
    await w.db.admin`
      INSERT INTO users (id, business_id, email, password_hash, role, active, locale)
      VALUES (gen_random_uuid(), ${w.businessId}, 'LATE@realdb.test', 'x', 'accountant', true, 'bn')
    `;
    expect(await accept(w, token)).toEqual({ ok: false, error: { kind: "email_taken" } });
    expect(await count(w, "SELECT count(*) FROM invitations WHERE used_at IS NULL")).toBe(1);
    expect(await auditCount(w, "auth.invite_accepted")).toBe(0);
  });

  test("listStaff on Postgres: role order, used and expired filtered, 200 and truncated (G-04)", async () => {
    const w = await world("liststaff");
    await w.db.admin`
      INSERT INTO users (id, business_id, email, password_hash, role, active, locale)
      VALUES (gen_random_uuid(), ${w.businessId}, 'Acc@realdb.test', 'x', 'accountant', false, 'bn')
    `;
    const pending = await invitedToken(w, "pending@realdb.test");
    expect(pending.length).toBe(43);
    await w.db.admin`
      INSERT INTO invitations (id, business_id, email, role, accept_token_hash, expires_at, used_at, created_by)
      VALUES (gen_random_uuid(), ${w.businessId}, 'expired@realdb.test', 'accountant', 'h-expired',
              now() - interval '1 minute', NULL, ${w.owner.id}),
             (gen_random_uuid(), ${w.businessId}, 'used@realdb.test', 'accountant', 'h-used',
              now() + interval '1 day', now(), ${w.owner.id})
    `;
    const list = await listStaff(w.db.app, {
      businessId: w.businessId,
      actor: w.manager,
      now: now(),
    });
    expect(list.members.map((m) => [m.role, m.email, m.canReset])).toEqual([
      ["owner", "owner@realdb.test", false],
      ["manager", "manager@realdb.test", false],
      ["sales_staff", "sales@realdb.test", true],
      ["accountant", "Acc@realdb.test", false],
    ]);
    expect(list.invitations.map((i) => i.email)).toEqual(["pending@realdb.test"]);
    expect(list.truncated).toBe(false);
    await w.db.admin`
      INSERT INTO users (id, business_id, email, password_hash, role, active, locale)
      SELECT gen_random_uuid(), ${w.businessId}, 'bulk' || g || '@realdb.test', 'x', 'sales_staff', true, 'bn'
      FROM generate_series(1, 200) AS g
    `;
    const big = await listStaff(w.db.app, { businessId: w.businessId, actor: w.owner, now: now() });
    expect(big.members).toHaveLength(200);
    expect(big.truncated).toBe(true);
    expect(big.members[0]?.role).toBe("owner");
  });
});
