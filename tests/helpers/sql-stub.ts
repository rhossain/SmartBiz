/**
 * tests/helpers/sql-stub.ts — minimal in-memory Sql stub for
 * unit tests that don't need a real database. Records the calls
 * so tests can assert the audit append behaviour (UC-1.9) and
 * the SQL invariants (BR1.1) without DATABASE_URL.
 */
import type { Sql } from "../../src/db/client.js";
import type { Uuid } from "../../src/types/uuid.js";

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
}

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
  };
} => {
  const calls: RecordedCall[] = [];
  const state = {
    users: [...(opts.users ?? [])],
    businesses: [...(opts.businesses ?? [])],
    invitations: [...(opts.invitations ?? [])],
    passwordResets: [...(opts.passwordResets ?? [])],
    auditLog: [...(opts.auditLog ?? [])],
  };
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
    // Simulate common patterns.
    if (/INSERT INTO users/i.test(text) && /email/i.test(text)) {
      const [id, email, passwordHash, role, locale, createdAt, updatedAt] = params as [
        Uuid, string, string, string, string, string, string,
      ];
      if (state.users.some((u) => (u["email"] as string).toLowerCase() === email.toLowerCase())) {
        const e: Error & { code?: string } = new Error("duplicate key");
        e.code = "23505";
        throw e;
      }
      state.users.push({
        id, email, password_hash: passwordHash, role, active: true, locale,
        created_at: createdAt, updated_at: updatedAt,
      });
      return [];
    }
    if (/INSERT INTO businesses/i.test(text)) {
      const [id, name, locale, ownerUserId, createdAt, updatedAt] = params as [
        Uuid, string, string, Uuid, Date, Date,
      ];
      state.businesses.push({ id, name, locale, ownerUserId, createdAt, updatedAt });
      return [];
    }
    if (/INSERT INTO sessions/i.test(text)) return [];
    if (/INSERT INTO invitations/i.test(text)) {
      const [id, businessId, email, role, acceptTokenHash, expiresAt, createdBy, createdAt] = params as [
        Uuid, Uuid, string, string, string, string, Uuid, string,
      ];
      state.invitations.push({
        id, business_id: businessId, email, role,
        accept_token_hash: acceptTokenHash, expires_at: expiresAt,
        used_at: null, created_by: createdBy, created_at: createdAt,
      });
      return [];
    }
    if (/INSERT INTO password_resets/i.test(text)) {
      const [id, userId, tokenHash, expiresAt, createdAt] = params as [
        Uuid, Uuid, string, string, string,
      ];
      state.passwordResets.push({
        id, user_id: userId, token_hash: tokenHash,
        expires_at: expiresAt, used_at: null, created_at: createdAt,
      });
      return [];
    }
    if (/INSERT INTO audit_log/i.test(text)) {
      const [id, businessId, actorUserId, correlationId, action, subjectKind, subjectId, payloadJson, reversesId, occurredAt, retentionUntil] = params as [
        Uuid, Uuid, Uuid | null, string, string, string | null, Uuid | null, string, Uuid | null, Date, Date,
      ];
      state.auditLog.push({
        id, business_id: businessId, actor_user_id: actorUserId,
        correlation_id: correlationId, action, subject_kind: subjectKind,
        subject_id: subjectId, payload: payloadJson, reverses_id: reversesId,
        occurred_at: occurredAt, retention_until: retentionUntil,
      });
      return [];
    }
    if (/SELECT id, email, password_hash/i.test(text)) {
      const [email] = params as [string];
      return state.users.filter((u) => (u["email"] as string) === email);
    }
    if (/SELECT id, email, password_hash, role, active, locale, created_at, updated_at/i.test(text)) {
      const [email] = params as [string];
      return state.users.filter((u) => (u["email"] as string) === email);
    }
    if (/SELECT id FROM users WHERE email/i.test(text)) {
      const [email] = params as [string];
      return state.users.filter((u) => (u["email"] as string) === email).map((u) => ({ id: u["id"] }));
    }
    if (/SELECT id FROM users WHERE id/i.test(text)) return [];
    if (/SELECT id FROM businesses WHERE owner_user_id/i.test(text)) {
      const [ownerUserId] = params as [string];
      return state.businesses.filter((b) => b["ownerUserId"] === ownerUserId).map((b) => ({ id: b["id"] }));
    }
    if (/SELECT id FROM businesses WHERE/i.test(text)) return [];
    if (/SELECT id, business_id, email, role, expires_at, used_at\s+FROM invitations/i.test(text)) {
      const [tokenHash] = params as [string];
      return state.invitations.filter(
        (i) => (i["accept_token_hash"] as string) === tokenHash,
      );
    }
    if (/SELECT id, user_id, expires_at, used_at FROM password_resets/i.test(text)) {
      const [tokenHash] = params as [string];
      return state.passwordResets.filter(
        (r) => (r["token_hash"] as string) === tokenHash,
      );
    }
    if (/SELECT u.id FROM users u/i.test(text)) {
      const [email] = params as [string];
      return state.users.filter((u) => (u["email"] as string) === email && u["active"] === true);
    }
    if (/SELECT id FROM businesses WHERE owner_user_id = .* LIMIT 1/i.test(text)) {
      const [ownerUserId] = params as [string];
      return state.businesses.filter((b) => b["owner_user_id"] === ownerUserId).map((b) => ({ id: b["id"] }));
    }
    if (/UPDATE users SET password_hash/g.test(text)) return [];
    if (/UPDATE password_resets SET used_at/g.test(text)) return [];
    if (/UPDATE invitations SET used_at/g.test(text)) return [];
    if (/DELETE FROM sessions/i.test(text)) return [];
    if (/SELECT id, email, password_hash, role, active, locale, created_at, updated_at/i.test(text)) {
      const [email] = params as [string];
      return state.users.filter((u) => (u["email"] as string) === email);
    }
    return [];
  }) as unknown as Sql;
  // Attach begin() helper.
  (sql as unknown as { begin: (fn: (tx: Sql) => Promise<unknown>) => Promise<unknown> }).begin = async (
    fn: (tx: Sql) => Promise<unknown>,
  ) => fn(sql);
  return { sql, calls, state };
};