/**
 * tests/unit/catalog-notes.test.ts — append-only notes on the fail-closed stub (U4 W3;
 * BR4.1–BR4.3, BR10.1, BR10.2, BR11.2; R17; AC3.2.1, AC3.2.3).
 *
 * Restated: a revision is a NEW note pointing at the earlier one and the earlier row never
 * changes — no UPDATE statement is ever sent (the named mutant "a note revision issued as
 * UPDATE" is caught here: app_role holds no UPDATE on customer_notes, mirrored by the stub);
 * a note is revised at most once (409), only within its own customer (404); the change-log
 * row's subject is the customer and its payload holds ids only; a unique violation on the
 * revision constraint alone becomes `conflict`, any other database error is rethrown.
 */
import { describe, expect, test } from "bun:test";
import { createCustomer } from "../../src/catalog/customers.js";
import { addNote } from "../../src/catalog/notes.js";
import type { Uuid } from "../../src/data/uuid.js";
import { makeSqlStub } from "../helpers/sql-stub.js";
import { seedBusiness } from "../helpers/server-harness.js";
import { auditRows, catalogWorld, ctxFor, FOREIGN_BUSINESS } from "../helpers/catalog-fixtures.js";

const owner = ctxFor("owner");

const must = <T>(r: { ok: true; value: T } | { ok: false; error: unknown }): T => {
  if (!r.ok) throw new Error(`expected ok, got ${JSON.stringify(r.error)}`);
  return r.value;
};

const withCustomer = async (stub = makeSqlStub()) => {
  if (stub.state.businesses.length === 0) await seedBusiness(stub);
  const c = must(await createCustomer(stub.sql, owner, { name: "A", phone: "01712345678" }));
  return { stub, customerId: c.customer.id };
};

describe("addNote (W3)", () => {
  test("adds a note; the change-log row names the customer and the note id, never the text", async () => {
    const { stub, customerId } = await withCustomer();
    const note = must(
      await addNote(stub.sql, ctxFor("sales_staff"), customerId, { text: "  ভালো  " }),
    );
    expect(note).toMatchObject({
      text: "ভালো",
      revisesNoteId: null,
      authorName: "sales_staff@acme.test",
    });
    expect(auditRows(stub).at(-1)).toEqual({
      action: "customer.note.add",
      subjectKind: "customer",
      subjectId: customerId,
      payload: { noteId: note.id, revisesNoteId: null },
    });
  });

  test("a revision is a new row; the earlier note is unchanged and no UPDATE is sent", async () => {
    const { stub, customerId } = await withCustomer();
    const first = must(await addNote(stub.sql, owner, customerId, { text: "প্রথম" }));
    const snapshot = structuredClone(stub.state.customerNotes);
    const second = must(
      await addNote(stub.sql, owner, customerId, { text: "সংশোধিত", revisesNoteId: first.id }),
    );
    expect(second.revisesNoteId).toBe(first.id);
    expect(stub.state.customerNotes).toHaveLength(2);
    expect(stub.state.customerNotes[0]).toEqual(snapshot[0]);
    expect(stub.calls.some((c) => /UPDATE\s+customer_notes/i.test(c.text))).toBe(false);
  });

  test("a note is revised at most once (409, BR4.3)", async () => {
    const { stub, customerId } = await withCustomer();
    const first = must(await addNote(stub.sql, owner, customerId, { text: "১" }));
    must(await addNote(stub.sql, owner, customerId, { text: "২", revisesNoteId: first.id }));
    const again = await addNote(stub.sql, owner, customerId, {
      text: "৩",
      revisesNoteId: first.id,
    });
    expect(again.ok ? null : again.error).toEqual({
      kind: "conflict",
      reason: "note_already_revised",
    });
    expect(stub.state.customerNotes).toHaveLength(2);
  });

  test("revising another customer's note, or an unknown one, is not found (BR4.2)", async () => {
    const { stub, customerId } = await withCustomer();
    const other = must(await createCustomer(stub.sql, owner, { name: "B", phone: "01812345678" }));
    const theirs = must(await addNote(stub.sql, owner, other.customer.id, { text: "B-এর নোট" }));
    const cross = await addNote(stub.sql, owner, customerId, {
      text: "x",
      revisesNoteId: theirs.id,
    });
    expect(cross.ok ? "ok" : cross.error.kind).toBe("not_found");
    const unknown = await addNote(stub.sql, owner, customerId, {
      text: "x",
      revisesNoteId: "0f0f0f0f-0f0f-4f0f-8f0f-0f0f0f0f0f0f",
    });
    expect(unknown.ok ? "ok" : unknown.error.kind).toBe("not_found");
    const calls = stub.calls.length;
    const nonUuid = await addNote(stub.sql, owner, customerId, { text: "x", revisesNoteId: "abc" });
    expect(nonUuid.ok ? "ok" : nonUuid.error.kind).toBe("not_found");
    expect(stub.calls.length).toBe(calls);
  });

  test("another business's customer, a non-UUID customer and the Accountant are refused", async () => {
    const { stub, customerId } = await withCustomer();
    const foreign = await addNote(stub.sql, ctxFor("owner", FOREIGN_BUSINESS), customerId, {
      text: "x",
    });
    expect(foreign.ok ? "ok" : foreign.error.kind).toBe("not_found");
    const bad = await addNote(stub.sql, owner, "nope", { text: "x" });
    expect(bad.ok ? "ok" : bad.error.kind).toBe("not_found");
    const accountant = await addNote(stub.sql, ctxFor("accountant"), customerId, { text: "x" });
    expect(accountant.ok ? "ok" : accountant.error.kind).toBe("forbidden");
  });

  test("an empty or 2 001-character note is refused (BR4.1)", async () => {
    const { stub, customerId } = await withCustomer();
    for (const text of ["   ", "ক".repeat(2001)]) {
      const r = await addNote(stub.sql, owner, customerId, { text });
      expect(r.ok ? "ok" : r.error.kind).toBe("invalid_input");
    }
    expect(
      must(await addNote(stub.sql, owner, customerId, { text: "ক".repeat(2000) })).text,
    ).toHaveLength(2000);
  });

  test("the race's unique violation becomes conflict and rolls the change-log row back (R17)", async () => {
    const stub = makeSqlStub({
      faults: [
        {
          match: /INSERT INTO customer_notes/,
          code: "23505",
          times: 1,
          constraint_name: "customer_notes_revises_note_id_key",
        },
      ],
    });
    const { customerId } = await withCustomer(stub);
    const audits = stub.state.auditLog.length;
    const r = await addNote(stub.sql, owner, customerId, { text: "x" });
    expect(r.ok ? null : r.error).toEqual({ kind: "conflict", reason: "note_already_revised" });
    expect(stub.state.auditLog.length).toBe(audits);
  });

  test("any other database error is rethrown, never a conflict", async () => {
    const stub = makeSqlStub({
      faults: [
        {
          match: /INSERT INTO customer_notes/,
          code: "23505",
          times: 1,
          constraint_name: "other_key",
        },
      ],
    });
    const { customerId } = await withCustomer(stub);
    await expect(addNote(stub.sql, owner, customerId as Uuid, { text: "x" })).rejects.toThrow();
  });
});

describe("the stub mirrors app_role on customer_notes (BR12.2)", () => {
  test("UPDATE and DELETE on customer_notes are refused with 42501", async () => {
    const stub = await catalogWorld();
    expect(() => stub.sql`UPDATE customer_notes SET text = ${"x"}`).toThrow(/permission denied/);
    expect(() => stub.sql`DELETE FROM customer_notes`).toThrow(/permission denied/);
  });
});
