/**
 * tests/helpers/sql-stub.ts — minimal in-memory Sql stub for
 * unit tests that don't need a real database. Records the calls
 * so tests can assert the audit append behaviour (UC-1.9) and
 * the SQL invariants (BR1.1) without DATABASE_URL.
 */
import type { Sql } from "../../src/db/client.js";
import type { Uuid } from "../../src/data/uuid.js";

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
  /** Throw a simulated database error on the first statement whose text matches. */
  failOn?: RegExp;
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
    // The application role holds INSERT only on audit_log (R1.1); mirror the DB refusal.
    if (/(UPDATE\s+audit_log|DELETE\s+FROM\s+audit_log|TRUNCATE\s+audit_log)/i.test(text)) {
      throw dbError("permission denied for table audit_log", "42501");
    }
    const b2 = handleOrders(text, params, state);
    if (b2 !== undefined) return b2;
    const sessionRows = handleSessions(text, params, state);
    if (sessionRows !== undefined) return sessionRows;
    // Simulate common patterns.
    if (/INSERT INTO users/i.test(text) && /email/i.test(text)) {
      const [id, email, passwordHash, role, locale, createdAt, updatedAt] = params as [
        Uuid,
        string,
        string,
        string,
        string,
        string,
        string,
      ];
      if (state.users.some((u) => (u["email"] as string).toLowerCase() === email.toLowerCase())) {
        const e: Error & { code?: string } = new Error("duplicate key");
        e.code = "23505";
        throw e;
      }
      state.users.push({
        id,
        email,
        password_hash: passwordHash,
        role,
        active: true,
        locale,
        created_at: createdAt,
        updated_at: updatedAt,
      });
      return [];
    }
    if (/INSERT INTO businesses/i.test(text)) {
      const [id, name, locale, ownerUserId, createdAt, updatedAt] = params as [
        Uuid,
        string,
        string,
        Uuid,
        Date,
        Date,
      ];
      state.businesses.push({ id, name, locale, ownerUserId, createdAt, updatedAt });
      return [];
    }
    if (/INSERT INTO invitations/i.test(text)) {
      const [id, businessId, email, role, acceptTokenHash, expiresAt, createdBy, createdAt] =
        params as [Uuid, Uuid, string, string, string, string, Uuid, string];
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
    if (
      /FROM audit_log\s+WHERE business_id = \?\s+ORDER BY occurred_at DESC\s+LIMIT \?/i.test(text)
    ) {
      const [businessId, limit] = params as [string, number];
      return state.auditLog
        .filter((a) => a["business_id"] === businessId)
        .sort(
          (a, b) =>
            new Date(String(b["occurred_at"])).getTime() -
            new Date(String(a["occurred_at"])).getTime(),
        )
        .slice(0, limit)
        .map((a) => ({ ...a }));
    }
    if (/SELECT id, email, password_hash/i.test(text)) {
      const [email] = params as [string];
      return state.users.filter((u) => (u["email"] as string) === email);
    }
    if (
      /SELECT id, email, password_hash, role, active, locale, created_at, updated_at/i.test(text)
    ) {
      const [email] = params as [string];
      return state.users.filter((u) => (u["email"] as string) === email);
    }
    if (/SELECT id FROM users WHERE email/i.test(text)) {
      const [email] = params as [string];
      return state.users
        .filter((u) => (u["email"] as string) === email)
        .map((u) => ({ id: u["id"] }));
    }
    if (/SELECT id FROM users WHERE id/i.test(text)) return [];
    if (/SELECT id FROM businesses WHERE owner_user_id/i.test(text)) {
      const [ownerUserId] = params as [string];
      return state.businesses
        .filter((b) => b["ownerUserId"] === ownerUserId)
        .map((b) => ({ id: b["id"] }));
    }
    if (/SELECT id FROM businesses WHERE/i.test(text)) return [];
    if (/SELECT id, business_id, email, role, expires_at, used_at\s+FROM invitations/i.test(text)) {
      const [tokenHash] = params as [string];
      return state.invitations.filter((i) => (i["accept_token_hash"] as string) === tokenHash);
    }
    if (/SELECT id, user_id, expires_at, used_at FROM password_resets/i.test(text)) {
      const [tokenHash] = params as [string];
      return state.passwordResets.filter((r) => (r["token_hash"] as string) === tokenHash);
    }
    if (/SELECT u.id FROM users u/i.test(text)) {
      const [email] = params as [string];
      return state.users.filter((u) => (u["email"] as string) === email && u["active"] === true);
    }
    if (/SELECT id FROM businesses WHERE owner_user_id = .* LIMIT 1/i.test(text)) {
      const [ownerUserId] = params as [string];
      return state.businesses
        .filter((b) => b["owner_user_id"] === ownerUserId)
        .map((b) => ({ id: b["id"] }));
    }
    if (/UPDATE users SET password_hash/g.test(text)) return [];
    if (/UPDATE password_resets SET used_at/g.test(text)) return [];
    if (/UPDATE invitations SET used_at/g.test(text)) return [];
    if (
      /SELECT id, email, password_hash, role, active, locale, created_at, updated_at/i.test(text)
    ) {
      const [email] = params as [string];
      return state.users.filter((u) => (u["email"] as string) === email);
    }
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
