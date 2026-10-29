/**
 * src/catalog/notes.ts — a customer's append-only notes (U4 W3; US3.2; BR4.1–BR4.4, BR10.1,
 * BR10.2, BR11.2; R17; NFR7.24; functional-design Q6).
 *
 * `addNote`, in this order:
 *   1. the role may write customers (BR1.2), the customer id and any `revisesNoteId` are
 *      UUIDs (D13: a non-UUID is 404 like a missing id) and the text is 1–2 000 characters
 *      after trimming (BR4.1) — all before any SQL;
 *   2. one transaction: the customer must belong to the session's business (404); a
 *      revision must name a note OF THIS CUSTOMER (404, BR4.2) that no note revises yet
 *      (409 `conflict`, BR4.3); then the change-log row `customer.note.add`, whose subject is
 *      the customer and whose payload holds the note's id and the id it revises — never the
 *      text (BR10.2) — and then the new note;
 *   3. a race between two revisions of one note is decided by the unique constraint on
 *      `revises_note_id`: the loser's insert fails with 23505 on
 *      `customer_notes_revises_note_id_key`, which alone becomes `conflict`; anything else
 *      is rethrown (unique-violation.ts).
 * A revision is a NEW row; no statement ever updates or deletes a note, and app_role holds
 * no UPDATE or DELETE on the table (BR4.2, BR12.2), so each history is one straight line.
 * The answer names the author by email, as the audit trail does — never the user id (§3a).
 */
import type { Queryable, Sql } from "../db/client.js";
import { now } from "../data/clock.js";
import { notFound } from "../data/not-found.js";
import { err, ok, type Result } from "../data/result.js";
import { isUuid, uuid, type Uuid } from "../data/uuid.js";
import { insertCatalogAudit, noteAdded } from "./catalog-audit.js";
import { canWriteCustomers } from "./catalog-capability.js";
import { fieldIssues, NoteCreateSchema, type NoteCreate } from "./schemas.js";
import type { CatalogContext, CatalogDeps, CatalogError, Note } from "./types.js";
import { isUniqueViolationOn, NOTE_REVISION_UNIQUE } from "./unique-violation.js";

export interface NewNote {
  readonly id: Uuid;
  readonly revisesNoteId: Uuid | null;
}

/** The note row itself (also the optional first note of a new customer, BR3.4). */
export const insertNote = async (
  tx: Queryable,
  ctx: CatalogContext,
  customerId: Uuid,
  note: NewNote,
  text: string,
  at: string,
): Promise<void> => {
  await tx`
    INSERT INTO customer_notes (id, business_id, customer_id, text, revises_note_id, created_by, created_at)
    VALUES (${note.id}, ${ctx.businessId}, ${customerId}, ${text}, ${note.revisesNoteId},
            ${ctx.actorUserId}, ${at})
  `;
};

/** The acting user's email, as notes and the audit trail name an author. */
const authorEmail = async (tx: Queryable, ctx: CatalogContext): Promise<string | null> => {
  const rows = await tx<{ email: string }[]>`
    SELECT email FROM users WHERE id = ${ctx.actorUserId} AND business_id = ${ctx.businessId}
  `;
  return rows[0]?.email ?? null;
};

type PriorState = "missing" | "revised" | "open";

/** BR4.2, BR4.3: is the note one of this customer's, and is it still the latest version? */
const priorState = async (
  tx: Queryable,
  ctx: CatalogContext,
  customerId: Uuid,
  noteId: Uuid,
): Promise<PriorState> => {
  const rows = await tx<{ id: string; revised: boolean }[]>`
    SELECT n.id, EXISTS (SELECT 1 FROM customer_notes r WHERE r.revises_note_id = n.id) AS revised
    FROM customer_notes n
    WHERE n.id = ${noteId} AND n.business_id = ${ctx.businessId} AND n.customer_id = ${customerId}
  `;
  const row = rows[0];
  if (row === undefined) return "missing";
  return row.revised ? "revised" : "open";
};

export const addNote = async (
  sql: Sql,
  ctx: CatalogContext,
  customerId: string,
  raw: NoteCreate,
  deps: CatalogDeps = {},
): Promise<Result<Note, CatalogError>> => {
  if (!canWriteCustomers(ctx.role)) return err({ kind: "forbidden" });
  if (!isUuid(customerId)) return err(notFound("Customer", customerId));
  const valid = NoteCreateSchema.safeParse(raw);
  if (!valid.success) return err({ kind: "invalid_input", fields: fieldIssues(valid.error) });
  const revises = valid.data.revisesNoteId ?? null;
  if (revises !== null && !isUuid(revises)) return err(notFound("CustomerNote", revises));
  const note: NewNote = { id: uuid(), revisesNoteId: revises };
  const text = valid.data.text;
  const at = now().toISOString();

  try {
    return await sql.begin(async (tx): Promise<Result<Note, CatalogError>> => {
      const owner = await tx<{ id: string }[]>`
        SELECT id FROM customers WHERE id = ${customerId} AND business_id = ${ctx.businessId}
      `;
      if (owner.length === 0) return err(notFound("Customer", customerId));
      if (revises !== null) {
        const state = await priorState(tx, ctx, customerId, revises);
        if (state === "missing") return err(notFound("CustomerNote", revises));
        if (state === "revised") return err({ kind: "conflict", reason: "note_already_revised" });
      }
      // Test-only pause point: two revisions both past the check above (R17).
      await deps.hooks?.afterLock?.();
      await insertCatalogAudit(tx, ctx, noteAdded(customerId, note));
      await insertNote(tx, ctx, customerId, note, text, at);
      return ok({
        id: note.id,
        text,
        revisesNoteId: note.revisesNoteId,
        createdAt: at,
        authorName: await authorEmail(tx, ctx),
      });
    });
  } catch (e: unknown) {
    if (isUniqueViolationOn(e, NOTE_REVISION_UNIQUE)) {
      return err({ kind: "conflict", reason: "note_already_revised" });
    }
    throw e;
  }
};
