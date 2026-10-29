/**
 * src/catalog/customers.ts — customers: record, edit, find and open (U4 W1, W2, W4; US3.1,
 * US3.3; BR2.1, BR3.1–BR3.4, BR4.4, BR5.1, BR10.1, BR10.2, BR11.1, BR11.2; R18, R20; SC7;
 * S28, S30, S32; NFR6.30, NFR7.25, NFR7.27).
 *
 * Writes (W1, W2), each in one transaction:
 *   - the role must hold the customer-write set (BR1.2), the body is the strict schema, and
 *     the phone is normalised to `01XXXXXXXXX` or refused on the `phone` field (BR2.1) —
 *     before any SQL;
 *   - create: change-log row `customer.create` {riskLevel, hasAddress} first, then the
 *     customer (risk level 0 unless sent, address null unless sent, BR3.1); with a first
 *     note, its own `customer.note.add` row and then the note (BR3.4);
 *   - edit (partial, D10): lock the customer row of the session's business (404 otherwise),
 *     keep every omitted field, clear the address on `address: null`, never apply the risk
 *     default; when nothing changed, commit nothing and answer the stored customer (BR10.1,
 *     R20); otherwise the `customer.update` row names the changed fields and only the risk
 *     change's values (BR10.2), then the update. Two concurrent edits queue on the lock, so
 *     the second's "before" is the first's "after" (R18);
 *   - both answer `duplicatePhoneOf`: the oldest OTHER customer of the business with the same
 *     phone, or null — a warning, never a refusal (BR3.3, Q4).
 * Reads:
 *   - the list (BR5.1): newest first on (created_at DESC, id DESC) with the C1 cursor, at most
 *     `limit` (1–50) plus `nextCursor` (fetch n + 1, SC7), and `total` = every customer
 *     matching `q` (D11); `q` matches the name (ILIKE with `\ % _` escaped, S32) and, with 4+
 *     digits, the phone (rules/phone.ts);
 *   - the detail (BR4.4): the customer and its newest 200 notes, newest first, each with its
 *     author's email, and `notesTruncated` beyond 200.
 * Every query filters on the session's business; a foreign, missing or non-UUID id is the
 * same `not_found` (BR11.2), and a non-UUID never reaches SQL (D13).
 */
import type { Queryable, Sql } from "../db/client.js";
import { now } from "../data/clock.js";
import { decodeCursor, encodeCursor } from "../data/keyset-cursor.js";
import { notFound, type NotFound } from "../data/not-found.js";
import { err, ok, type Result } from "../data/result.js";
import { isUuid, uuid, type Uuid } from "../data/uuid.js";
import {
  customerCreated,
  customerUpdated,
  insertCatalogAudit,
  noteAdded,
  type CustomerField,
} from "./catalog-audit.js";
import { canReadCatalog, canWriteCustomers } from "./catalog-capability.js";
import { insertNote, type NewNote } from "./notes.js";
import { blankToNull, toCustomer, toIso, toRisk, type CustomerDbRow } from "./rows.js";
import { normalisePhone, searchTerms } from "./rules/phone.js";
import {
  CustomerCreateSchema,
  CustomerUpdateSchema,
  fieldIssues,
  ListFilterSchema,
  type CustomerCreate,
  type CustomerUpdate,
  type ListFilter,
} from "./schemas.js";
import type {
  CatalogContext,
  CatalogDeps,
  CatalogError,
  CatalogForbidden,
  CatalogInvalid,
  Customer,
  CustomerDetail,
  CustomerList,
  CustomerWriteResult,
  DuplicatePhone,
  Note,
  RiskLevel,
} from "./types.js";

export const CUSTOMER_PAGE_SIZE = 50;
/** BR4.4, D11: the detail shows the newest 200 notes. */
export const NOTES_LIMIT = 200;

const CUSTOMER_FIELDS: ReadonlyArray<CustomerField> = ["name", "phone", "address", "riskLevel"];

const PHONE_REFUSED: CatalogInvalid = {
  kind: "invalid_input",
  fields: [{ path: "phone", message: "not a Bangladeshi mobile number" }],
};

/** BR3.3: the oldest other customer of the business with this phone, or null. */
export const findDuplicatePhone = async (
  sql: Queryable,
  businessId: Uuid,
  customerId: Uuid,
  phone: string,
): Promise<DuplicatePhone | null> => {
  const rows = await sql<{ id: string; name: string }[]>`
    SELECT id, name FROM customers
    WHERE business_id = ${businessId} AND phone = ${phone} AND id <> ${customerId}
    ORDER BY created_at, id
    LIMIT 1
  `;
  const row = rows[0];
  return row === undefined ? null : { id: row.id as Uuid, name: row.name };
};

export const createCustomer = async (
  sql: Sql,
  ctx: CatalogContext,
  raw: CustomerCreate,
): Promise<Result<CustomerWriteResult, CatalogError>> => {
  if (!canWriteCustomers(ctx.role)) return err({ kind: "forbidden" });
  const valid = CustomerCreateSchema.safeParse(raw);
  if (!valid.success) return err({ kind: "invalid_input", fields: fieldIssues(valid.error) });
  const input = valid.data;
  const phone = normalisePhone(input.phone);
  if (phone === null) return err(PHONE_REFUSED);
  const at = now().toISOString();
  const customer: Customer = {
    id: uuid(),
    name: input.name,
    phone,
    address: blankToNull(input.address),
    riskLevel: (input.riskLevel ?? 0) as RiskLevel,
    createdAt: at,
    updatedAt: at,
  };
  const firstNote: NewNote | null =
    input.note !== undefined ? { id: uuid(), revisesNoteId: null } : null;

  return sql.begin(async (tx): Promise<Result<CustomerWriteResult, CatalogError>> => {
    await insertCatalogAudit(tx, ctx, customerCreated(customer));
    await tx`
      INSERT INTO customers (id, business_id, name, phone, address, risk_level, created_by, created_at, updated_at)
      VALUES (${customer.id}, ${ctx.businessId}, ${customer.name}, ${customer.phone},
              ${customer.address}, ${customer.riskLevel}, ${ctx.actorUserId}, ${at}, ${at})
    `;
    if (firstNote !== null && input.note !== undefined) {
      await insertCatalogAudit(tx, ctx, noteAdded(customer.id, firstNote));
      await insertNote(tx, ctx, customer.id, firstNote, input.note, at);
    }
    const duplicatePhoneOf = await findDuplicatePhone(tx, ctx.businessId, customer.id, phone);
    return ok({ customer, duplicatePhoneOf });
  });
};

const lockCustomer = async (
  tx: Queryable,
  businessId: Uuid,
  id: Uuid,
): Promise<Customer | null> => {
  const rows = await tx<CustomerDbRow[]>`
    SELECT id, name, phone, address, risk_level, created_at, updated_at
    FROM customers WHERE id = ${id} AND business_id = ${businessId}
    FOR UPDATE
  `;
  return rows[0] === undefined ? null : toCustomer(rows[0]);
};

export const updateCustomer = async (
  sql: Sql,
  ctx: CatalogContext,
  id: string,
  raw: CustomerUpdate,
  deps: CatalogDeps = {},
): Promise<Result<CustomerWriteResult, CatalogError>> => {
  if (!canWriteCustomers(ctx.role)) return err({ kind: "forbidden" });
  if (!isUuid(id)) return err(notFound("Customer", id));
  const valid = CustomerUpdateSchema.safeParse(raw);
  if (!valid.success) return err({ kind: "invalid_input", fields: fieldIssues(valid.error) });
  const patch = valid.data;
  const phone = patch.phone === undefined ? undefined : normalisePhone(patch.phone);
  if (phone === null) return err(PHONE_REFUSED);

  return sql.begin(async (tx): Promise<Result<CustomerWriteResult, CatalogError>> => {
    const before = await lockCustomer(tx, ctx.businessId, id);
    if (before === null) return err(notFound("Customer", id));
    await deps.hooks?.afterLock?.();
    const merged: Customer = {
      ...before,
      name: patch.name ?? before.name,
      phone: phone ?? before.phone,
      address: patch.address !== undefined ? blankToNull(patch.address) : before.address,
      riskLevel: (patch.riskLevel ?? before.riskLevel) as RiskLevel,
    };
    const changed = CUSTOMER_FIELDS.filter((f) => merged[f] !== before[f]);
    // R20, BR10.1: an edit that changes nothing writes nothing.
    if (changed.length === 0) {
      const duplicatePhoneOf = await findDuplicatePhone(
        tx,
        ctx.businessId,
        before.id,
        before.phone,
      );
      return ok({ customer: before, duplicatePhoneOf });
    }
    const after: Customer = { ...merged, updatedAt: now().toISOString() };
    await insertCatalogAudit(tx, ctx, customerUpdated(before, after, changed));
    await tx`
      UPDATE customers
      SET name = ${after.name}, phone = ${after.phone}, address = ${after.address},
          risk_level = ${after.riskLevel}, updated_at = ${after.updatedAt}
      WHERE id = ${after.id} AND business_id = ${ctx.businessId}
    `;
    const duplicatePhoneOf = await findDuplicatePhone(tx, ctx.businessId, after.id, after.phone);
    return ok({ customer: after, duplicatePhoneOf });
  });
};

interface NoteDbRow {
  readonly id: string;
  readonly text: string;
  readonly revises_note_id: string | null;
  readonly created_at: Date | string;
  readonly author_email: string | null;
}

export const getCustomerDetail = async (
  sql: Queryable,
  ctx: CatalogContext,
  id: string,
): Promise<Result<CustomerDetail, NotFound | CatalogForbidden>> => {
  if (!canReadCatalog(ctx.role)) return err({ kind: "forbidden" });
  if (!isUuid(id)) return err(notFound("Customer", id));
  const rows = await sql<CustomerDbRow[]>`
    SELECT id, name, phone, address, risk_level, created_at, updated_at
    FROM customers WHERE id = ${id} AND business_id = ${ctx.businessId}
  `;
  const row = rows[0];
  if (row === undefined) return err(notFound("Customer", id));
  const noteRows = await sql<NoteDbRow[]>`
    SELECT n.id, n.text, n.revises_note_id, n.created_at, u.email AS author_email
    FROM customer_notes n
    LEFT JOIN users u ON u.id = n.created_by
    WHERE n.business_id = ${ctx.businessId} AND n.customer_id = ${id}
    ORDER BY n.created_at DESC, n.id DESC
    LIMIT ${NOTES_LIMIT + 1}
  `;
  const notes: Note[] = noteRows.slice(0, NOTES_LIMIT).map((n) => ({
    id: n.id as Uuid,
    text: n.text,
    revisesNoteId: n.revises_note_id as Uuid | null,
    createdAt: toIso(n.created_at),
    authorName: n.author_email,
  }));
  return ok({ ...toCustomer(row), notes, notesTruncated: noteRows.length > NOTES_LIMIT });
};

type ListRow = Omit<CustomerDbRow, "updated_at">;

export const listCustomers = async (
  sql: Queryable,
  ctx: CatalogContext,
  query: ListFilter = {},
): Promise<Result<CustomerList, CatalogInvalid | CatalogForbidden>> => {
  if (!canReadCatalog(ctx.role)) return err({ kind: "forbidden" });
  const valid = ListFilterSchema.safeParse(query);
  if (!valid.success) return err({ kind: "invalid_input", fields: fieldIssues(valid.error) });
  const cursor = valid.data.cursor !== undefined ? decodeCursor(valid.data.cursor) : null;
  if (valid.data.cursor !== undefined && cursor === null) {
    return err({
      kind: "invalid_input",
      fields: [{ path: "cursor", message: "malformed cursor" }],
    });
  }
  const limit = Math.min(valid.data.limit ?? CUSTOMER_PAGE_SIZE, CUSTOMER_PAGE_SIZE);
  const { namePattern, phonePattern } = searchTerms(valid.data.q);
  const cursorAt = cursor?.createdAt ?? null;
  const cursorId = cursor?.id ?? null;
  const rows = await sql<ListRow[]>`
    SELECT id, name, phone, address, risk_level, created_at
    FROM customers
    WHERE business_id = ${ctx.businessId}
      AND (${namePattern}::text IS NULL OR name ILIKE ${namePattern} ESCAPE '\\'
           OR (${phonePattern}::text IS NOT NULL AND phone LIKE ${phonePattern}))
      AND (${cursorAt}::timestamptz IS NULL OR (created_at, id) < (${cursorAt}::timestamptz, ${cursorId}::uuid))
    ORDER BY created_at DESC, id DESC
    LIMIT ${limit + 1}
  `;
  const totals = await sql<{ total: number }[]>`
    SELECT count(*)::int AS total
    FROM customers
    WHERE business_id = ${ctx.businessId}
      AND (${namePattern}::text IS NULL OR name ILIKE ${namePattern} ESCAPE '\\'
           OR (${phonePattern}::text IS NOT NULL AND phone LIKE ${phonePattern}))
  `;
  const page = rows.slice(0, limit).map((r) => ({
    id: r.id as Uuid,
    name: r.name,
    phone: r.phone,
    address: r.address,
    riskLevel: toRisk(r.risk_level),
    createdAt: toIso(r.created_at),
  }));
  const last = page[page.length - 1];
  return ok({
    customers: page,
    nextCursor: rows.length > limit && last ? encodeCursor(last.createdAt, last.id) : null,
    total: Number(totals[0]?.total ?? 0),
  });
};
