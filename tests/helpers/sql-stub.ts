/**
 * tests/helpers/sql-stub.ts — minimal in-memory Sql stub for
 * unit tests that don't need a real database. Records the calls
 * so tests can assert the audit append behaviour (UC-1.9) and
 * the SQL invariants (BR1.1) without DATABASE_URL.
 */
import type { Sql } from "../../src/db/client.js";
import type { Uuid } from "../../src/data/uuid.js";
import { handleCatalog } from "./catalog-stub.js";

export interface RecordedCall {
  readonly text: string;
  readonly params: ReadonlyArray<unknown>;
}

export interface SqlStubOptions {
  users?: ReadonlyArray<Record<string, unknown>>;
  businesses?: ReadonlyArray<Record<string, unknown>>;
  invitations?: ReadonlyArray<Record<string, unknown>>;
  passwordResets?: ReadonlyArray<Record<string, unknown>>;
  auditLog?: Array<Record<string, unknown>>;
  /* B2 (U3-orders) tables. */
  orders?: ReadonlyArray<Record<string, unknown>>;
  orderItems?: ReadonlyArray<Record<string, unknown>>;
  consignmentLinks?: ReadonlyArray<Record<string, unknown>>;
  /* U1 sessions (token_hash, absolute and idle limits). */
  sessions?: ReadonlyArray<Record<string, unknown>>;
  /* U4 catalog tables (snake_case rows, as Postgres returns them). */
  suppliers?: ReadonlyArray<Record<string, unknown>>;
  customers?: ReadonlyArray<Record<string, unknown>>;
  customerNotes?: ReadonlyArray<Record<string, unknown>>;
  products?: ReadonlyArray<Record<string, unknown>>;
  variants?: ReadonlyArray<Record<string, unknown>>;
  /** Throw a simulated database error on the first statement whose text matches. */
  failOn?: RegExp;
  /**
   * U3: throw a database error with `code` (and `constraint_name`) on the next `times`
   * statements whose text matches, then run normally — a deadlock that clears on retry
   * (NFR7.18) or a unique violation on a named index (NFR7.21).
   */
  faults?: ReadonlyArray<StubFault>;
}

export interface StubFault {
  readonly match: RegExp;
  readonly code: string;
  times: number;
  readonly constraint_name?: string;
}

type Row = Record<string, unknown>;

/** Postgres compares uuids bytewise; plain string order matches that for lowercase hex. */
const byteCompare = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

const dbError = (message: string, code: string): Error & { code: string } =>
  Object.assign(new Error(message), { code });

/**
 * B2 statement handlers. Each mirrors one query shape in src/orders/
 * (one parameter per `${}`, no fragments) and emulates what Postgres
 * returns: BIGINT money as strings, TIMESTAMPTZ as Date, JSONB parsed.
 * Returns `undefined` when the statement is not a B2 statement.
 */
const handleOrders = (
  text: string,
  params: ReadonlyArray<unknown>,
  state: { orders: Row[]; orderItems: Row[]; consignmentLinks: Row[]; seq: { n: number } },
): Row[] | undefined => {
  if (/SELECT nextval\('orders_order_no_seq'\)/i.test(text)) {
    state.seq.n += 1;
    return [{ n: String(state.seq.n) }];
  }
  if (/INSERT INTO orders \(/i.test(text)) {
    const [
      id,
      businessId,
      orderNo,
      customerId,
      contact,
      status,
      source,
      repeatOf,
      itemsRevision,
      odisc,
      deliv,
      total,
      createdBy,
      createdAt,
      updatedAt,
    ] = params;
    if (state.orders.some((o) => o["business_id"] === businessId && o["order_no"] === orderNo)) {
      throw dbError("duplicate key value violates unique constraint", "23505");
    }
    state.orders.push({
      id,
      business_id: businessId,
      order_no: orderNo,
      customer_id: customerId,
      contact: contact === null ? null : JSON.parse(String(contact)),
      status,
      source,
      repeat_of_order_id: repeatOf,
      items_revision: Number(itemsRevision),
      order_discount_paise: String(odisc),
      delivery_charge_paise: String(deliv),
      total_paise: String(total),
      created_by: createdBy,
      created_at: new Date(String(createdAt)),
      updated_at: new Date(String(updatedAt)),
    });
    return [];
  }
  if (/INSERT INTO order_items/i.test(text)) {
    const [
      id,
      orderId,
      businessId,
      revision,
      lineNo,
      variantId,
      description,
      quantity,
      unit,
      lineDisc,
    ] = params;
    // UNIQUE(order_id, revision, line_no) from 0015.
    if (
      state.orderItems.some(
        (i) => i["order_id"] === orderId && i["revision"] === revision && i["line_no"] === lineNo,
      )
    ) {
      throw dbError("duplicate key value violates unique constraint", "23505");
    }
    state.orderItems.push({
      id,
      order_id: orderId,
      business_id: businessId,
      revision,
      line_no: lineNo,
      variant_id: variantId,
      description,
      quantity,
      unit_price_paise: String(unit),
      line_discount_paise: String(lineDisc),
    });
    return [];
  }
  if (/SELECT id FROM orders WHERE id = \? AND business_id = \?/i.test(text)) {
    const [id, businessId] = params;
    return state.orders
      .filter((o) => o["id"] === id && o["business_id"] === businessId)
      .map((o) => ({ id: o["id"] }));
  }
  if (/FROM orders\s+WHERE id = \? AND business_id = \?/i.test(text)) {
    const [id, businessId] = params;
    return state.orders
      .filter((o) => o["id"] === id && o["business_id"] === businessId)
      .map((o) => ({ ...o }));
  }
  if (
    /FROM order_items oi\s+JOIN orders o ON o\.id = oi\.order_id AND o\.items_revision = oi\.revision\s+WHERE oi\.business_id = \? AND oi\.order_id = ANY/i.test(
      text,
    )
  ) {
    const [businessId, ids] = params as [string, string[]];
    const current = new Map(state.orders.map((o) => [o["id"], o["items_revision"]]));
    return state.orderItems
      .filter((i) => i["business_id"] === businessId && ids.includes(i["order_id"] as string))
      .filter((i) => current.get(i["order_id"]) === i["revision"])
      .sort(
        (a, b) =>
          byteCompare(String(a["order_id"]), String(b["order_id"])) ||
          Number(a["line_no"]) - Number(b["line_no"]),
      )
      .map((i) => ({ ...i }));
  }
  if (/UPDATE orders\s+SET customer_id = \?/i.test(text)) {
    const [customerId, contact, odisc, deliv, total, itemsRevision, updatedAt, id, businessId] =
      params;
    for (const o of state.orders) {
      if (o["id"] !== id || o["business_id"] !== businessId) continue;
      o["customer_id"] = customerId;
      o["contact"] = contact === null ? null : JSON.parse(String(contact));
      o["order_discount_paise"] = String(odisc);
      o["delivery_charge_paise"] = String(deliv);
      o["total_paise"] = String(total);
      o["items_revision"] = Number(itemsRevision);
      o["updated_at"] = new Date(String(updatedAt));
    }
    return [];
  }
  if (/UPDATE orders SET status = \?/i.test(text)) {
    const [status, updatedAt, id, businessId, from] = params;
    for (const o of state.orders) {
      if (o["id"] === id && o["business_id"] === businessId && o["status"] === from) {
        o["status"] = status;
        o["updated_at"] = new Date(String(updatedAt));
      }
    }
    return [];
  }
  // app_role holds no DELETE on order_items (0015, amendment A3); mirror the refusal.
  if (/DELETE\s+FROM\s+order_items/i.test(text)) {
    throw dbError("permission denied for table order_items", "42501");
  }
  if (/FROM consignment_link\s+WHERE order_id = \? AND business_id = \?/i.test(text)) {
    const [orderId, businessId] = params;
    return state.consignmentLinks
      .filter((l) => l["order_id"] === orderId && l["business_id"] === businessId)
      .map((l) => ({ ...l }));
  }
  if (/INSERT INTO consignment_link/i.test(text)) {
    const [id, businessId, orderId, courier, ref, linkedBy, linkedAt] = params;
    const clash = state.consignmentLinks.some(
      (l) =>
        l["order_id"] === orderId ||
        (l["business_id"] === businessId && l["consignment_ref"] === ref),
    );
    if (clash) throw dbError("duplicate key value violates unique constraint", "23505");
    state.consignmentLinks.push({
      id,
      business_id: businessId,
      order_id: orderId,
      courier,
      consignment_ref: ref,
      linked_by: linkedBy,
      linked_at: new Date(String(linkedAt)),
    });
    return [];
  }
  if (/FROM orders\s+WHERE business_id = \?[\s\S]*ORDER BY created_at DESC, id DESC/i.test(text)) {
    const [businessId, status, , customerId, , from, , to, , cursorAt, , cursorId, limit] =
      params as [
        string,
        string | null,
        unknown,
        string | null,
        unknown,
        string | null,
        unknown,
        string | null,
        unknown,
        string | null,
        unknown,
        string | null,
        number,
      ];
    const time = (o: Row): number => (o["created_at"] as Date).getTime();
    return state.orders
      .filter((o) => o["business_id"] === businessId)
      .filter((o) => status === null || o["status"] === status)
      .filter((o) => customerId === null || o["customer_id"] === customerId)
      .filter((o) => from === null || time(o) >= Date.parse(from))
      .filter((o) => to === null || time(o) < Date.parse(to))
      .filter((o) => {
        if (cursorAt === null) return true;
        const c = Date.parse(cursorAt);
        return time(o) < c || (time(o) === c && String(o["id"]) < String(cursorId));
      })
      .sort((a, b) => time(b) - time(a) || byteCompare(String(b["id"]), String(a["id"])))
      .slice(0, limit)
      .map((o) => ({ ...o }));
  }
  return undefined;
};

const asTime = (v: unknown): number => (v instanceof Date ? v.getTime() : Date.parse(String(v)));

const lower = (v: unknown): string => String(v).toLowerCase();

const ROLE_ORDER = ["owner", "manager", "sales_staff", "accountant"];

/**
 * U3 statements (src/auth/invite.ts, accept-invite.ts, password-reset.ts). Each mirrors one
 * query shape exactly, one parameter per `${}`, and emulates what Postgres would do with it:
 * the 0017 unique indexes on the two token hashes, `lower(email)` comparisons, the `CASE`
 * role order of the staff list, `LIMIT`, and the `used_at IS NULL` / `expires_at >` filters.
 * Row locks (`FOR UPDATE`) cannot be seen in memory; the order of the lock statements is
 * visible in `calls`, and the locking itself is tested in tests/realdb/staff.realdb.test.ts.
 */
const handleStaff = (
  text: string,
  params: ReadonlyArray<unknown>,
  state: {
    users: Row[];
    businesses: Row[];
    invitations: Row[];
    passwordResets: Row[];
    sessions: Row[];
  },
): Row[] | undefined => {
  // U3 G-01: sign-in's session transaction (business key share, then the user row).
  if (/^\s*SELECT id FROM businesses WHERE id = \? FOR KEY SHARE\s*$/i.test(text)) {
    const [id] = params;
    return state.businesses.filter((b) => b["id"] === id).map((b) => ({ id: b["id"] }));
  }
  if (/^\s*SELECT password_hash, active FROM users WHERE id = \? FOR UPDATE\s*$/i.test(text)) {
    const [id] = params;
    return state.users
      .filter((u) => u["id"] === id)
      .map((u) => ({ password_hash: u["password_hash"], active: u["active"] }));
  }
  if (/^\s*SELECT id FROM businesses WHERE id = \? FOR UPDATE\s*$/i.test(text)) {
    const [id] = params;
    return state.businesses.filter((b) => b["id"] === id).map((b) => ({ id: b["id"] }));
  }
  if (/^\s*SELECT id FROM users WHERE lower\(email\) = \? LIMIT 1\s*$/i.test(text)) {
    const [email] = params;
    return state.users
      .filter((u) => lower(u["email"]) === email)
      .slice(0, 1)
      .map((u) => ({ id: u["id"] }));
  }
  if (
    /SELECT id, role FROM invitations\s+WHERE business_id = \? AND lower\(email\) = \?\s+AND used_at IS NULL AND expires_at > \?::timestamptz\s+ORDER BY id FOR UPDATE/i.test(
      text,
    )
  ) {
    const [businessId, email, nowIso] = params;
    return state.invitations
      .filter((i) => i["business_id"] === businessId && lower(i["email"]) === email)
      .filter((i) => i["used_at"] === null && asTime(i["expires_at"]) > asTime(nowIso))
      .sort((a, b) => byteCompare(String(a["id"]), String(b["id"])))
      .map((i) => ({ id: i["id"], role: i["role"] }));
  }
  if (/^\s*UPDATE invitations SET used_at = \?::timestamptz WHERE id = \?\s*$/i.test(text)) {
    const [at, id] = params;
    for (const i of state.invitations) if (i["id"] === id) i["used_at"] = at;
    return [];
  }
  if (
    /SELECT id, email, role, active FROM users\s+WHERE business_id = \?\s+ORDER BY CASE role WHEN 'owner' THEN 0 WHEN 'manager' THEN 1 WHEN 'sales_staff' THEN 2 ELSE 3 END,\s+lower\(email\), id\s+LIMIT \?/i.test(
      text,
    )
  ) {
    const [businessId, limit] = params;
    return state.users
      .filter((u) => u["business_id"] === businessId)
      .sort(
        (a, b) =>
          ROLE_ORDER.indexOf(String(a["role"])) - ROLE_ORDER.indexOf(String(b["role"])) ||
          byteCompare(lower(a["email"]), lower(b["email"])) ||
          byteCompare(String(a["id"]), String(b["id"])),
      )
      .slice(0, Number(limit))
      .map((u) => ({ id: u["id"], email: u["email"], role: u["role"], active: u["active"] }));
  }
  if (
    /SELECT id, email, role, expires_at FROM invitations\s+WHERE business_id = \? AND used_at IS NULL\s+AND expires_at > \?::timestamptz\s+ORDER BY expires_at, id\s+LIMIT \?/i.test(
      text,
    )
  ) {
    const [businessId, nowIso, limit] = params;
    return state.invitations
      .filter((i) => i["business_id"] === businessId && i["used_at"] === null)
      .filter((i) => asTime(i["expires_at"]) > asTime(nowIso))
      .sort(
        (a, b) =>
          asTime(a["expires_at"]) - asTime(b["expires_at"]) ||
          byteCompare(String(a["id"]), String(b["id"])),
      )
      .slice(0, Number(limit))
      .map((i) => ({
        id: i["id"],
        email: i["email"],
        role: i["role"],
        expires_at: i["expires_at"],
      }));
  }
  const invitationColumns =
    /SELECT id, business_id, email, role, expires_at, used_at\s+FROM invitations/i;
  if (invitationColumns.test(text) && /WHERE accept_token_hash = \?\s*$/i.test(text)) {
    const [tokenHash] = params;
    return state.invitations
      .filter((i) => i["accept_token_hash"] === tokenHash)
      .map((i) => ({ ...i }));
  }
  if (invitationColumns.test(text) && /WHERE id = \? FOR UPDATE\s*$/i.test(text)) {
    const [id] = params;
    return state.invitations.filter((i) => i["id"] === id).map((i) => ({ ...i }));
  }
  if (
    /^\s*SELECT id, business_id, role, active FROM users WHERE lower\(email\) = \?\s*$/i.test(text)
  ) {
    const [email] = params;
    return state.users
      .filter((u) => lower(u["email"]) === email)
      .map((u) => ({
        id: u["id"],
        business_id: u["business_id"],
        role: u["role"],
        active: u["active"],
      }));
  }
  if (/^\s*SELECT id, business_id, role, active FROM users WHERE id = \?\s*$/i.test(text)) {
    const [id] = params;
    return state.users
      .filter((u) => u["id"] === id)
      .map((u) => ({
        id: u["id"],
        business_id: u["business_id"],
        role: u["role"],
        active: u["active"],
      }));
  }
  if (/^\s*SELECT active FROM users WHERE id = \? FOR UPDATE\s*$/i.test(text)) {
    const [id] = params;
    return state.users.filter((u) => u["id"] === id).map((u) => ({ active: u["active"] }));
  }
  if (
    /^\s*UPDATE password_resets SET used_at = \?::timestamptz\s+WHERE user_id = \? AND used_at IS NULL\s*$/i.test(
      text,
    )
  ) {
    const [at, userId] = params;
    for (const r of state.passwordResets) {
      if (r["user_id"] === userId && r["used_at"] === null) r["used_at"] = at;
    }
    return [];
  }
  if (
    /SELECT r\.id, r\.user_id, r\.expires_at, r\.used_at, u\.business_id, u\.active\s+FROM password_resets r JOIN users u ON u\.id = r\.user_id\s+WHERE r\.token_hash = \?/i.test(
      text,
    )
  ) {
    const [tokenHash] = params;
    return state.passwordResets
      .filter((r) => r["token_hash"] === tokenHash)
      .flatMap((r) => {
        const u = state.users.find((x) => x["id"] === r["user_id"]);
        return u === undefined
          ? []
          : [
              {
                id: r["id"],
                user_id: r["user_id"],
                expires_at: r["expires_at"],
                used_at: r["used_at"],
                business_id: u["business_id"],
                active: u["active"],
              },
            ];
      });
  }
  if (
    /SELECT id, expires_at FROM password_resets\s+WHERE user_id = \? AND used_at IS NULL ORDER BY id FOR UPDATE/i.test(
      text,
    )
  ) {
    const [userId] = params;
    return state.passwordResets
      .filter((r) => r["user_id"] === userId && r["used_at"] === null)
      .sort((a, b) => byteCompare(String(a["id"]), String(b["id"])))
      .map((r) => ({ id: r["id"], expires_at: r["expires_at"] }));
  }
  if (
    /^\s*UPDATE users SET password_hash = \?, updated_at = \?::timestamptz\s+WHERE id = \?\s*$/i.test(
      text,
    )
  ) {
    const [hash, at, id] = params;
    for (const u of state.users) {
      if (u["id"] === id) {
        u["password_hash"] = hash;
        u["updated_at"] = at;
      }
    }
    return [];
  }
  if (/^\s*DELETE FROM sessions WHERE user_id = \?\s*$/i.test(text)) {
    const [userId] = params;
    const keep = state.sessions.filter((s) => s["user_id"] !== userId);
    state.sessions.splice(0, state.sessions.length, ...keep);
    return [];
  }
  return undefined;
};

/**
 * U1 session-store statements (src/auth/session.ts). The resolve statement's comparison
 * operators are read from the SQL text, so a change from `>` to `>=` is seen by the unit
 * tests (the idle-boundary mutant), not only by tests/realdb.
 */
const handleSessions = (
  text: string,
  params: ReadonlyArray<unknown>,
  state: { sessions: Row[]; users: Row[] },
): Row[] | undefined => {
  if (/INSERT INTO sessions \(id, user_id, business_id, token_hash/i.test(text)) {
    const [id, userId, businessId, tokenHash, issuedAt, expiresAt, lastSeenAt] = params;
    if (state.sessions.some((s) => s["token_hash"] === tokenHash)) {
      throw dbError("duplicate key value violates unique constraint", "23505");
    }
    state.sessions.push({
      id,
      user_id: userId,
      business_id: businessId,
      token_hash: tokenHash,
      issued_at: new Date(String(issuedAt)),
      expires_at: new Date(String(expiresAt)),
      last_seen_at: new Date(String(lastSeenAt)),
    });
    return [];
  }
  if (/UPDATE sessions s\s+SET last_seen_at = \?::timestamptz\s+FROM users u/i.test(text)) {
    const [nowIso, tokenHash, nowAgain, idleCutoff] = params as [string, string, string, string];
    const strict = (column: string): boolean =>
      !new RegExp(`${column}\\s*>=`).test(text) && new RegExp(`${column}\\s*>`).test(text);
    const after = (value: unknown, bound: string, isStrict: boolean): boolean =>
      isStrict ? asTime(value) > Date.parse(bound) : asTime(value) >= Date.parse(bound);
    const expStrict = strict("s\\.expires_at");
    const idleStrict = strict("s\\.last_seen_at");
    const out: Row[] = [];
    for (const s of state.sessions) {
      if (s["token_hash"] !== tokenHash) continue;
      const u = state.users.find((x) => x["id"] === s["user_id"]);
      if (!u || u["active"] !== true) continue;
      if (!after(s["expires_at"], nowAgain, expStrict)) continue;
      if (!after(s["last_seen_at"], idleCutoff, idleStrict)) continue;
      s["last_seen_at"] = new Date(nowIso);
      out.push({
        user_id: s["user_id"],
        business_id: s["business_id"],
        role: u["role"],
        email: u["email"],
        locale: u["locale"],
        expires_at: s["expires_at"],
      });
    }
    return out;
  }
  if (/DELETE FROM sessions WHERE token_hash = \? RETURNING user_id, business_id/i.test(text)) {
    const [tokenHash] = params;
    const gone = state.sessions.filter((s) => s["token_hash"] === tokenHash);
    const keep = state.sessions.filter((s) => s["token_hash"] !== tokenHash);
    state.sessions.splice(0, state.sessions.length, ...keep);
    return gone.map((s) => ({ user_id: s["user_id"], business_id: s["business_id"] }));
  }
  return undefined;
};

/**
 * U2 audit reads (src/audit/audit-read.ts page read and src/audit/audit-export.ts batches).
 * Both seek on (occurred_at, id) descending, inside one business. The retention predicate
 * is read from the SQL text, as the session handler reads its operators: when the
 * statement carries `retention_until > ?` (or `>=`) the stub applies it, and when a change
 * drops it the stub returns expired rows too, so the unit tests see the defect
 * (mutant `audit-read-drops-retention`), not only tests/realdb. The page read joins the
 * actor's email from `users`; the export returns the payload and no email.
 */
const handleAuditReads = (
  text: string,
  params: ReadonlyArray<unknown>,
  state: { auditLog: Row[]; users: Row[] },
): Row[] | undefined => {
  const page =
    /FROM audit_log a\s+LEFT JOIN users u ON u\.id = a\.actor_user_id\s+WHERE a\.business_id = \?[\s\S]*ORDER BY a\.occurred_at DESC, a\.id DESC\s+LIMIT \?/i.test(
      text,
    );
  const batch =
    !page &&
    /SELECT a\.id, a\.business_id, a\.actor_user_id[\s\S]*a\.payload[\s\S]*FROM audit_log a\s+WHERE a\.business_id = \?[\s\S]*ORDER BY a\.occurred_at DESC, a\.id DESC\s+LIMIT \?/i.test(
      text,
    );
  if (!page && !batch) return undefined;
  const retention = /a\.retention_until\s*(>=?)\s*\?/.exec(text);
  let i = 0;
  const businessId = params[i++] as string;
  const nowIso = retention ? (params[i++] as string) : null;
  const cursorAt = params[i++] as string | null;
  i += 1; // the cursor time appears twice: `? IS NULL OR (…) < (?, ?)`
  const cursorId = params[i++] as string | null;
  const limit = Number(params[i]);
  const inclusive = retention?.[1] === ">=";
  return state.auditLog
    .filter((a) => a["business_id"] === businessId)
    .filter((a) => {
      if (nowIso === null) return true;
      const until = asTime(a["retention_until"]);
      return inclusive ? until >= Date.parse(nowIso) : until > Date.parse(nowIso);
    })
    .filter((a) => {
      if (cursorAt === null) return true;
      const t = asTime(a["occurred_at"]);
      const c = Date.parse(cursorAt);
      return t < c || (t === c && byteCompare(String(a["id"]), String(cursorId)) < 0);
    })
    .sort(
      (a, b) =>
        asTime(b["occurred_at"]) - asTime(a["occurred_at"]) ||
        byteCompare(String(b["id"]), String(a["id"])),
    )
    .slice(0, limit)
    .map((a) => {
      const base = {
        id: a["id"],
        occurred_at: new Date(asTime(a["occurred_at"])),
        action: a["action"],
        subject_kind: a["subject_kind"] ?? null,
        subject_id: a["subject_id"] ?? null,
        correlation_id: a["correlation_id"],
        reverses_id: a["reverses_id"] ?? null,
      };
      if (page) {
        const actor = state.users.find((u) => u["id"] === a["actor_user_id"]);
        return { ...base, actor_email: actor ? (actor["email"] as string) : null };
      }
      const payload = a["payload"];
      return {
        ...base,
        business_id: a["business_id"],
        actor_user_id: a["actor_user_id"] ?? null,
        payload: typeof payload === "string" ? (JSON.parse(payload) as unknown) : payload,
      };
    });
};

export const makeSqlStub = (
  opts: SqlStubOptions = {},
): {
  sql: Sql;
  calls: RecordedCall[];
  state: {
    users: Array<Record<string, unknown>>;
    businesses: Array<Record<string, unknown>>;
    invitations: Array<Record<string, unknown>>;
    passwordResets: Array<Record<string, unknown>>;
    auditLog: Array<Record<string, unknown>>;
    orders: Array<Record<string, unknown>>;
    orderItems: Array<Record<string, unknown>>;
    consignmentLinks: Array<Record<string, unknown>>;
    sessions: Array<Record<string, unknown>>;
    suppliers: Array<Record<string, unknown>>;
    customers: Array<Record<string, unknown>>;
    customerNotes: Array<Record<string, unknown>>;
    products: Array<Record<string, unknown>>;
    variants: Array<Record<string, unknown>>;
    seq: { n: number };
  };
} => {
  const calls: RecordedCall[] = [];
  const state = {
    users: [...(opts.users ?? [])],
    businesses: [...(opts.businesses ?? [])],
    invitations: [...(opts.invitations ?? [])],
    passwordResets: [...(opts.passwordResets ?? [])],
    auditLog: [...(opts.auditLog ?? [])],
    orders: [...(opts.orders ?? [])],
    orderItems: [...(opts.orderItems ?? [])],
    consignmentLinks: [...(opts.consignmentLinks ?? [])],
    sessions: [...(opts.sessions ?? [])],
    suppliers: [...(opts.suppliers ?? [])],
    customers: [...(opts.customers ?? [])],
    customerNotes: [...(opts.customerNotes ?? [])],
    products: [...(opts.products ?? [])],
    variants: [...(opts.variants ?? [])],
    seq: { n: 1000 },
  };
  // 0015 defaults: rows seeded without a revision are revision 1, as after the migration.
  for (const o of state.orders) o["items_revision"] ??= 1;
  for (const i of state.orderItems) i["revision"] ??= 1;
  // Normalise keys to snake_case so consumers see what Postgres would return.
  for (const u of state.users) {
    if (u["passwordHash"] !== undefined && u["password_hash"] === undefined) {
      (u as Record<string, unknown>)["password_hash"] = u["passwordHash"];
      delete (u as Record<string, unknown>)["passwordHash"];
    }
    if (u["createdAt"] !== undefined && u["created_at"] === undefined) {
      (u as Record<string, unknown>)["created_at"] = u["createdAt"];
      delete (u as Record<string, unknown>)["createdAt"];
    }
    if (u["updatedAt"] !== undefined && u["updated_at"] === undefined) {
      (u as Record<string, unknown>)["updated_at"] = u["updatedAt"];
      delete (u as Record<string, unknown>)["updatedAt"];
    }
  }
  for (const b of state.businesses) {
    if (b["ownerUserId"] !== undefined && b["owner_user_id"] === undefined) {
      (b as Record<string, unknown>)["owner_user_id"] = b["ownerUserId"];
      delete (b as Record<string, unknown>)["ownerUserId"];
    }
    if (b["createdAt"] !== undefined && b["created_at"] === undefined) {
      (b as Record<string, unknown>)["created_at"] = b["createdAt"];
      delete (b as Record<string, unknown>)["createdAt"];
    }
    if (b["updatedAt"] !== undefined && b["updated_at"] === undefined) {
      (b as Record<string, unknown>)["updated_at"] = b["updatedAt"];
      delete (b as Record<string, unknown>)["updatedAt"];
    }
  }
  for (const i of state.invitations) {
    if (i["acceptTokenHash"] !== undefined && i["accept_token_hash"] === undefined) {
      (i as Record<string, unknown>)["accept_token_hash"] = i["acceptTokenHash"];
      delete (i as Record<string, unknown>)["acceptTokenHash"];
    }
    if (i["businessId"] !== undefined && i["business_id"] === undefined) {
      (i as Record<string, unknown>)["business_id"] = i["businessId"];
      delete (i as Record<string, unknown>)["businessId"];
    }
    if (i["expiresAt"] !== undefined && i["expires_at"] === undefined) {
      (i as Record<string, unknown>)["expires_at"] = i["expiresAt"];
      delete (i as Record<string, unknown>)["expiresAt"];
    }
    if (i["usedAt"] !== undefined && i["used_at"] === undefined) {
      (i as Record<string, unknown>)["used_at"] = i["usedAt"];
      delete (i as Record<string, unknown>)["usedAt"];
    }
    if (i["createdBy"] !== undefined && i["created_by"] === undefined) {
      (i as Record<string, unknown>)["created_by"] = i["createdBy"];
      delete (i as Record<string, unknown>)["createdBy"];
    }
    if (i["createdAt"] !== undefined && i["created_at"] === undefined) {
      (i as Record<string, unknown>)["created_at"] = i["createdAt"];
      delete (i as Record<string, unknown>)["createdAt"];
    }
  }
  for (const r of state.passwordResets) {
    if (r["tokenHash"] !== undefined && r["token_hash"] === undefined) {
      (r as Record<string, unknown>)["token_hash"] = r["tokenHash"];
      delete (r as Record<string, unknown>)["tokenHash"];
    }
    if (r["userId"] !== undefined && r["user_id"] === undefined) {
      (r as Record<string, unknown>)["user_id"] = r["userId"];
      delete (r as Record<string, unknown>)["userId"];
    }
    if (r["expiresAt"] !== undefined && r["expires_at"] === undefined) {
      (r as Record<string, unknown>)["expires_at"] = r["expiresAt"];
      delete (r as Record<string, unknown>)["expiresAt"];
    }
    if (r["usedAt"] !== undefined && r["used_at"] === undefined) {
      (r as Record<string, unknown>)["used_at"] = r["usedAt"];
      delete (r as Record<string, unknown>)["usedAt"];
    }
    if (r["createdAt"] !== undefined && r["created_at"] === undefined) {
      (r as Record<string, unknown>)["created_at"] = r["createdAt"];
      delete (r as Record<string, unknown>)["createdAt"];
    }
  }
  const sql = ((strings: TemplateStringsArray, ...params: ReadonlyArray<unknown>) => {
    const text = strings.join("?");
    calls.push({ text, params });
    if (opts.failOn && opts.failOn.test(text)) {
      throw dbError(`simulated database failure on: ${text.trim().slice(0, 40)}`, "08006");
    }
    const fault = (opts.faults ?? []).find((f) => f.times > 0 && f.match.test(text));
    if (fault) {
      fault.times -= 1;
      throw Object.assign(dbError(`simulated ${fault.code}`, fault.code), {
        ...(fault.constraint_name !== undefined ? { constraint_name: fault.constraint_name } : {}),
      });
    }
    // The application role holds INSERT only on audit_log (R1.1); mirror the DB refusal.
    if (/(UPDATE\s+audit_log|DELETE\s+FROM\s+audit_log|TRUNCATE\s+audit_log)/i.test(text)) {
      throw dbError("permission denied for table audit_log", "42501");
    }
    const b2 = handleOrders(text, params, state);
    if (b2 !== undefined) return b2;
    const sessionRows = handleSessions(text, params, state);
    if (sessionRows !== undefined) return sessionRows;
    const staffRows = handleStaff(text, params, state);
    if (staffRows !== undefined) return staffRows;
    // U4: the catalog statements (tests/helpers/catalog-stub.ts).
    const catalogRows = handleCatalog(text, params, state);
    if (catalogRows !== undefined) return catalogRows;
    // U1 users: business_id set on insert; one account per email ignoring case (0013).
    if (
      /INSERT INTO users \(id, business_id, email, password_hash, role, active, locale, created_at, updated_at\)/i.test(
        text,
      )
    ) {
      const [id, businessId, email, passwordHash, role, active, locale, createdAt, updatedAt] =
        params as [Uuid, Uuid, string, string, string, boolean, string, string, string];
      if (state.users.some((u) => String(u["email"]).toLowerCase() === email.toLowerCase())) {
        throw Object.assign(dbError("duplicate key value violates unique constraint", "23505"), {
          constraint_name: "users_email_lower_unique_idx",
        });
      }
      state.users.push({
        id,
        business_id: businessId,
        email,
        password_hash: passwordHash,
        role,
        active,
        locale,
        created_at: createdAt,
        updated_at: updatedAt,
      });
      return [];
    }
    // businesses_singleton_idx (0011): a second business is a unique violation.
    if (
      /INSERT INTO businesses \(id, name, locale, owner_user_id, created_at, updated_at\)/i.test(
        text,
      )
    ) {
      const [id, name, locale, ownerUserId, createdAt, updatedAt] = params as [
        Uuid,
        string,
        string,
        Uuid,
        string,
        string,
      ];
      if (state.businesses.length > 0) {
        throw dbError("duplicate key value violates unique constraint", "23505");
      }
      state.businesses.push({
        id,
        name,
        locale,
        owner_user_id: ownerUserId,
        created_at: createdAt,
        updated_at: updatedAt,
      });
      return [];
    }
    if (/INSERT INTO invitations/i.test(text)) {
      const [id, businessId, email, role, acceptTokenHash, expiresAt, createdBy, createdAt] =
        params as [Uuid, Uuid, string, string, string, string, Uuid, string];
      // 0017: one row per token hash.
      if (state.invitations.some((i) => i["accept_token_hash"] === acceptTokenHash)) {
        throw Object.assign(dbError("duplicate key value violates unique constraint", "23505"), {
          constraint_name: "invitations_accept_token_hash_idx",
        });
      }
      state.invitations.push({
        id,
        business_id: businessId,
        email,
        role,
        accept_token_hash: acceptTokenHash,
        expires_at: expiresAt,
        used_at: null,
        created_by: createdBy,
        created_at: createdAt,
      });
      return [];
    }
    if (/INSERT INTO password_resets/i.test(text)) {
      const [id, userId, tokenHash, expiresAt, createdAt] = params as [
        Uuid,
        Uuid,
        string,
        string,
        string,
      ];
      // 0017: one row per token hash.
      if (state.passwordResets.some((r) => r["token_hash"] === tokenHash)) {
        throw Object.assign(dbError("duplicate key value violates unique constraint", "23505"), {
          constraint_name: "password_resets_token_hash_idx",
        });
      }
      state.passwordResets.push({
        id,
        user_id: userId,
        token_hash: tokenHash,
        expires_at: expiresAt,
        used_at: null,
        created_at: createdAt,
      });
      return [];
    }
    if (/INSERT INTO audit_log/i.test(text)) {
      const [
        id,
        businessId,
        actorUserId,
        correlationId,
        action,
        subjectKind,
        subjectId,
        payloadJson,
        reversesId,
        occurredAt,
        retentionUntil,
      ] = params as [
        Uuid,
        Uuid,
        Uuid | null,
        string,
        string,
        string | null,
        Uuid | null,
        string,
        Uuid | null,
        Date,
        Date,
      ];
      state.auditLog.push({
        id,
        business_id: businessId,
        actor_user_id: actorUserId,
        correlation_id: correlationId,
        action,
        subject_kind: subjectKind,
        subject_id: subjectId,
        payload: payloadJson,
        reverses_id: reversesId,
        occurred_at: occurredAt,
        retention_until: retentionUntil,
      });
      return [];
    }
    const auditRows = handleAuditReads(text, params, state);
    if (auditRows !== undefined) return auditRows;
    // U1 sign-in lookup: by email ignoring case.
    if (
      /SELECT id, business_id, email, password_hash, role, active, locale\s+FROM users WHERE lower\(email\) = lower\(\?\)/i.test(
        text,
      )
    ) {
      const [email] = params as [string];
      return state.users
        .filter((u) => String(u["email"]).toLowerCase() === email.toLowerCase())
        .map((u) => ({ ...u }));
    }
    // U1 health probe.
    if (/^\s*SELECT 1 AS ok\s*$/i.test(text)) return [{ ok: 1 }];
    // U1 setup: the one business, if any.
    if (/SELECT id FROM businesses LIMIT 1/i.test(text)) {
      return state.businesses.slice(0, 1).map((b) => ({ id: b["id"] }));
    }
    // U3: the B1 recovery, invite and accept shapes (exact-email lookups, the owner-business
    // fallback and the no-op UPDATEs) are gone with the code that sent them (F-07).
    // Fail closed (team.md Testing Posture): a new or mistyped query must not pass a unit
    // test on an empty result. Every new query shape gets a handler here and a realdb test.
    throw new Error(`sql-stub: unrecognised statement: ${text.replace(/\s+/g, " ").trim()}`);
  }) as unknown as Sql;
  // Attach begin() helper. Like Postgres, a throw inside the callback rolls
  // back every table to its state at BEGIN; a normal return commits.
  const tables = [
    state.users,
    state.businesses,
    state.invitations,
    state.passwordResets,
    state.auditLog,
    state.orders,
    state.orderItems,
    state.consignmentLinks,
    state.sessions,
    state.suppliers,
    state.customers,
    state.customerNotes,
    state.products,
    state.variants,
  ];
  (sql as unknown as { begin: (fn: (tx: Sql) => Promise<unknown>) => Promise<unknown> }).begin =
    async (fn: (tx: Sql) => Promise<unknown>) => {
      const snapshot = tables.map((t) => structuredClone(t));
      const seqAtBegin = state.seq.n;
      try {
        return await fn(sql);
      } catch (e) {
        tables.forEach((t, i) => t.splice(0, t.length, ...(snapshot[i] ?? [])));
        state.seq.n = seqAtBegin;
        throw e;
      }
    };
  // `sql.array(...)` is a typed array parameter in postgres.js; the stub passes it through.
  (sql as unknown as { array: (v: unknown) => unknown }).array = (v: unknown) => v;
  return { sql, calls, state };
};
