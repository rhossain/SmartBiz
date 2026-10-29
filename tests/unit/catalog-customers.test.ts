/**
 * tests/unit/catalog-customers.test.ts — record, edit, find and open a customer on the
 * fail-closed SQL stub (U4 W1, W2, W4; BR2.1, BR3.1–BR3.4, BR4.4, BR5.1, BR10.1, BR11.2; R20;
 * SC7; S32; NFR6.30, NFR7.27; C8 getCustomer / customerNames).
 *
 * Restated: the change-log row comes before the customer row; risk defaults to 0 and address
 * to null on create only; a phone is stored as 01XXXXXXXXX or refused on `phone`; a
 * duplicate phone is a warning naming the OLDEST other customer; an edit changes only what it
 * sends, `address: null` clears, and an edit that changes nothing writes nothing; search
 * matches names, and phones with 4+ digits, with `%` and `_` literal; pages are 50 + a cursor;
 * a foreign, missing or non-UUID id is not found. The stub cannot see row locks — the realdb
 * suite does.
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  createCustomer,
  getCustomerDetail,
  listCustomers,
  updateCustomer,
} from "../../src/catalog/customers.js";
import { customerNames, getCustomer } from "../../src/catalog/index.js";
import { resetTestClock, setTestClock } from "../../src/data/clock.js";
import type { Uuid } from "../../src/data/uuid.js";
import {
  auditRows,
  callIndex,
  catalogWorld,
  ctxFor,
  FOREIGN_BUSINESS,
  ZZ,
} from "../helpers/catalog-fixtures.js";

const owner = ctxFor("owner");
const sales = ctxFor("sales_staff");
const T0 = new Date("2026-10-28T10:00:00.000Z");
let tick = 0;

beforeEach(() => {
  tick = 0;
  setTestClock(T0);
});
afterEach(() => resetTestClock());

/** Advance the frozen clock by one second, so rows get distinct creation times. */
const later = (): void => {
  tick += 1;
  setTestClock(new Date(T0.getTime() + tick * 1000));
};

const must = <T>(r: { ok: true; value: T } | { ok: false; error: unknown }): T => {
  if (!r.ok) throw new Error(`expected ok, got ${JSON.stringify(r.error)}`);
  return r.value;
};

describe("createCustomer (W1)", () => {
  test("writes the change-log row first, then the customer, with the defaults", async () => {
    const stub = await catalogWorld();
    const r = must(
      await createCustomer(stub.sql, sales, { name: " রিনা ", phone: "০১৭১২-৩৪৫৬৭৮" }),
    );
    expect(r.customer).toMatchObject({
      name: "রিনা",
      phone: "01712345678",
      address: null,
      riskLevel: 0,
    });
    expect(r.duplicatePhoneOf).toBeNull();
    expect(callIndex(stub, /INSERT INTO audit_log/)).toBeLessThan(
      callIndex(stub, /INSERT INTO customers/),
    );
    expect(auditRows(stub)).toEqual([
      {
        action: "customer.create",
        subjectKind: "customer",
        subjectId: r.customer.id,
        payload: { riskLevel: 0, hasAddress: false },
      },
    ]);
  });

  test("a first note is saved in the same transaction with its own change-log row (BR3.4)", async () => {
    const stub = await catalogWorld();
    const r = must(
      await createCustomer(stub.sql, owner, {
        name: "রিনা",
        phone: "01712345678",
        address: "ঢাকা",
        riskLevel: 2,
        note: "বাকিতে নেন",
      }),
    );
    expect(stub.state.customerNotes).toHaveLength(1);
    expect(auditRows(stub).map((a) => a.action)).toEqual(["customer.create", "customer.note.add"]);
    expect(auditRows(stub)[1]?.subjectId).toBe(r.customer.id);
    expect(r.customer.riskLevel).toBe(2);
  });

  test("a bad phone is refused on the `phone` field and nothing is written (BR2.1)", async () => {
    const stub = await catalogWorld();
    const r = await createCustomer(stub.sql, owner, { name: "X", phone: "01212345678" });
    expect(r.ok ? null : r.error).toEqual({
      kind: "invalid_input",
      fields: [{ path: "phone", message: "not a Bangladeshi mobile number" }],
    });
    expect(stub.state.customers).toHaveLength(0);
    expect(stub.state.auditLog).toHaveLength(0);
  });

  test("unknown keys, an empty name and a risk of 4 are refused before any SQL", async () => {
    const stub = await catalogWorld();
    const before = stub.calls.length;
    for (const body of [
      { name: "X", phone: "01712345678", businessId: "x" },
      { name: "  ", phone: "01712345678" },
      { name: "X", phone: "01712345678", riskLevel: 4 },
      { name: "X", phone: "01712345678", note: "n".repeat(2001) },
    ]) {
      const r = await createCustomer(stub.sql, owner, body as never);
      expect(r.ok ? "ok" : r.error.kind).toBe("invalid_input");
    }
    expect(stub.calls.length).toBe(before);
  });

  test("the Accountant cannot create a customer (BR1.2)", async () => {
    const stub = await catalogWorld();
    const r = await createCustomer(stub.sql, ctxFor("accountant"), {
      name: "X",
      phone: "01712345678",
    });
    expect(r.ok ? "ok" : r.error.kind).toBe("forbidden");
  });

  test("a duplicate phone is a warning naming the oldest other customer (BR3.3)", async () => {
    const stub = await catalogWorld();
    const first = must(
      await createCustomer(stub.sql, owner, { name: "প্রথম", phone: "01712345678" }),
    );
    later();
    must(await createCustomer(stub.sql, owner, { name: "দ্বিতীয়", phone: "01712345678" }));
    later();
    const third = must(
      await createCustomer(stub.sql, owner, { name: "তৃতীয়", phone: "+8801712345678" }),
    );
    expect(third.duplicatePhoneOf).toEqual({ id: first.customer.id, name: "প্রথম" });
    expect(stub.state.customers).toHaveLength(3);
  });
});

describe("updateCustomer (W2, D10)", () => {
  test("only the sent fields change; the change log names them, with risk before/after", async () => {
    const stub = await catalogWorld();
    const c = must(
      await createCustomer(stub.sql, owner, { name: "A", phone: "01712345678", address: "ঢাকা" }),
    ).customer;
    later();
    const r = must(await updateCustomer(stub.sql, sales, c.id, { riskLevel: 3, address: null }));
    expect(r.customer).toMatchObject({
      name: "A",
      phone: "01712345678",
      address: null,
      riskLevel: 3,
    });
    expect(r.customer.updatedAt).not.toBe(c.updatedAt);
    const last = auditRows(stub).at(-1);
    expect(last).toEqual({
      action: "customer.update",
      subjectKind: "customer",
      subjectId: c.id,
      payload: { changed: ["address", "riskLevel"], riskLevel: { before: 0, after: 3 } },
    });
    expect(callIndex(stub, /INSERT INTO audit_log[\s\S]*/)).toBeGreaterThanOrEqual(0);
  });

  test("an edit that changes nothing writes nothing and answers the stored customer (R20)", async () => {
    const stub = await catalogWorld();
    const c = must(
      await createCustomer(stub.sql, owner, { name: "A", phone: "01712345678" }),
    ).customer;
    const audits = stub.state.auditLog.length;
    const r = must(
      await updateCustomer(stub.sql, owner, c.id, { name: "A", phone: "০১৭১২৩৪৫৬৭৮" }),
    );
    expect(r.customer).toEqual(c);
    expect(stub.state.auditLog.length).toBe(audits);
    expect(callIndex(stub, /UPDATE customers/)).toBe(-1);
  });

  test("a foreign, missing or non-UUID id is not found; an empty patch is refused", async () => {
    const stub = await catalogWorld();
    const c = must(
      await createCustomer(stub.sql, owner, { name: "A", phone: "01712345678" }),
    ).customer;
    const foreign = await updateCustomer(stub.sql, ctxFor("owner", FOREIGN_BUSINESS), c.id, {
      name: "B",
    });
    expect(foreign.ok ? "ok" : foreign.error.kind).toBe("not_found");
    const missing = await updateCustomer(stub.sql, owner, "0f0f0f0f-0f0f-4f0f-8f0f-0f0f0f0f0f0f", {
      name: "B",
    });
    expect(missing.ok ? "ok" : missing.error.kind).toBe("not_found");
    const calls = stub.calls.length;
    const bad = await updateCustomer(stub.sql, owner, "not-a-uuid", { name: "B" });
    expect(bad.ok ? "ok" : bad.error.kind).toBe("not_found");
    expect(stub.calls.length).toBe(calls);
    const empty = await updateCustomer(stub.sql, owner, c.id, {} as never);
    expect(empty.ok ? "ok" : empty.error.kind).toBe("invalid_input");
  });
});

describe("listCustomers (W4, BR5.1, SC7)", () => {
  const seedMany = async (n: number) => {
    const stub = await catalogWorld();
    for (let i = 0; i < n; i++) {
      must(
        await createCustomer(stub.sql, owner, {
          name: `C${i}`,
          phone: `0171${String(i).padStart(7, "0")}`,
        }),
      );
      later();
    }
    return stub;
  };

  test("50 per page, newest first, with a cursor; the next page finishes the list", async () => {
    const stub = await seedMany(51);
    const first = must(await listCustomers(stub.sql, owner, {}));
    expect(first.customers).toHaveLength(50);
    expect(first.customers[0]?.name).toBe("C50");
    expect(first.total).toBe(51);
    expect(first.nextCursor).not.toBeNull();
    const second = must(await listCustomers(stub.sql, owner, { cursor: first.nextCursor ?? "" }));
    expect(second.customers.map((c) => c.name)).toEqual(["C0"]);
    expect(second.nextCursor).toBeNull();
  });

  test("a numeric limit pages as the HTTP query's parsed limit does (C1 paging)", async () => {
    const stub = await seedMany(3);
    const page = must(await listCustomers(stub.sql, owner, { limit: 2 }));
    expect([page.customers.length, page.total, page.nextCursor !== null]).toEqual([2, 3, true]);
    const bad = await listCustomers(stub.sql, owner, { limit: 51 });
    expect(bad.ok ? "ok" : bad.error.kind).toBe("invalid_input");
  });

  test("exactly 50 rows: no next page", async () => {
    const stub = await seedMany(50);
    const page = must(await listCustomers(stub.sql, owner, {}));
    expect(page.customers).toHaveLength(50);
    expect(page.nextCursor).toBeNull();
  });

  test("names match case-insensitively; 4+ digits match the phone; fewer match names only", async () => {
    const stub = await catalogWorld();
    must(await createCustomer(stub.sql, owner, { name: "Rina Akter", phone: "01712345678" }));
    must(await createCustomer(stub.sql, owner, { name: "Karim 5678", phone: "01811111111" }));
    const byName = must(await listCustomers(stub.sql, owner, { q: "rina" }));
    expect(byName.customers.map((c) => c.name)).toEqual(["Rina Akter"]);
    const byPhone = must(await listCustomers(stub.sql, owner, { q: "৫৬৭৮" }));
    expect(byPhone.customers.map((c) => c.name).sort()).toEqual(["Karim 5678", "Rina Akter"]);
    expect(byPhone.total).toBe(2);
    const short = must(await listCustomers(stub.sql, owner, { q: "171" }));
    expect(short.customers).toEqual([]);
  });

  test("% and _ match literally (S32)", async () => {
    const stub = await catalogWorld();
    must(await createCustomer(stub.sql, owner, { name: "Sale 50%", phone: "01712345678" }));
    must(await createCustomer(stub.sql, owner, { name: "Sale 500", phone: "01712345679" }));
    must(await createCustomer(stub.sql, owner, { name: "a_b", phone: "01712345670" }));
    must(await createCustomer(stub.sql, owner, { name: "axb", phone: "01712345671" }));
    expect(
      must(await listCustomers(stub.sql, owner, { q: "50%" })).customers.map((c) => c.name),
    ).toEqual(["Sale 50%"]);
    expect(
      must(await listCustomers(stub.sql, owner, { q: "a_b" })).customers.map((c) => c.name),
    ).toEqual(["a_b"]);
  });

  test("a malformed cursor and a 101-character query are refused", async () => {
    const stub = await catalogWorld();
    const r = await listCustomers(stub.sql, owner, { cursor: "%%%" });
    expect(r.ok ? "ok" : r.error.kind).toBe("invalid_input");
    const long = await listCustomers(stub.sql, owner, { q: "x".repeat(101) });
    expect(long.ok ? "ok" : long.error.kind).toBe("invalid_input");
  });

  test("another business's customers are invisible", async () => {
    const stub = await catalogWorld();
    must(await createCustomer(stub.sql, owner, { name: "A", phone: "01712345678" }));
    const foreign = must(await listCustomers(stub.sql, ctxFor("owner", FOREIGN_BUSINESS), {}));
    expect(foreign).toEqual({ customers: [], nextCursor: null, total: 0 });
  });
});

describe("getCustomerDetail (W4, BR4.4)", () => {
  test("the customer with notes newest first, each with its author's email", async () => {
    const stub = await catalogWorld();
    const c = must(
      await createCustomer(stub.sql, sales, { name: "A", phone: "01712345678", note: "প্রথম" }),
    ).customer;
    const d = must(await getCustomerDetail(stub.sql, owner, c.id));
    expect(d.name).toBe("A");
    expect(d.notes.map((n) => [n.text, n.authorName])).toEqual([
      ["প্রথম", "sales_staff@acme.test"],
    ]);
    expect(d.notesTruncated).toBe(false);
  });

  test("past 200 notes, the newest 200 come back with notesTruncated", async () => {
    const stub = await catalogWorld();
    const c = must(
      await createCustomer(stub.sql, owner, { name: "A", phone: "01712345678" }),
    ).customer;
    for (let i = 0; i < 201; i++) {
      stub.state.customerNotes.push({
        id:
          `0000000${String(i).padStart(1, "0")}`.slice(0, 8) +
          `-0000-4000-8000-${String(i).padStart(12, "0")}`,
        business_id: owner.businessId,
        customer_id: c.id,
        text: `n${i}`,
        revises_note_id: null,
        created_by: owner.actorUserId,
        created_at: new Date(T0.getTime() + i * 1000),
      });
    }
    const d = must(await getCustomerDetail(stub.sql, owner, c.id));
    expect(d.notes).toHaveLength(200);
    expect(d.notes[0]?.text).toBe("n200");
    expect(d.notesTruncated).toBe(true);
  });

  test("foreign, missing and non-UUID ids are not found", async () => {
    const stub = await catalogWorld();
    const c = must(
      await createCustomer(stub.sql, owner, { name: "A", phone: "01712345678" }),
    ).customer;
    for (const [ctx, id] of [
      [ctxFor("owner", FOREIGN_BUSINESS), c.id],
      [owner, "0f0f0f0f-0f0f-4f0f-8f0f-0f0f0f0f0f0f"],
      [owner, "nope"],
    ] as const) {
      const r = await getCustomerDetail(stub.sql, ctx, id);
      expect(r.ok ? "ok" : r.error.kind).toBe("not_found");
    }
  });
});

describe("C8 customer reads (BR14.1, BR14.2)", () => {
  test("getCustomer answers the business's customer and NotFound otherwise", async () => {
    const stub = await catalogWorld();
    const c = must(
      await createCustomer(stub.sql, owner, { name: "A", phone: "01712345678" }),
    ).customer;
    expect(must(await getCustomer(stub.sql, owner, c.id))).toEqual({
      id: c.id,
      name: "A",
      phone: "01712345678",
    });
    const foreign = await getCustomer(stub.sql, { businessId: FOREIGN_BUSINESS }, c.id);
    expect(foreign.ok ? null : foreign.error).toEqual({
      kind: "not_found",
      entity: "Customer",
      id: c.id,
    });
    const bad = await getCustomer(stub.sql, owner, "x" as Uuid);
    expect(bad.ok ? "ok" : bad.error.kind).toBe("not_found");
  });

  test("customerNames resolves found ids only, in one query, and throws past 50", async () => {
    const stub = await catalogWorld();
    const c = must(
      await createCustomer(stub.sql, owner, { name: ZZ.name, phone: ZZ.phone }),
    ).customer;
    const names = await customerNames(stub.sql, owner, [
      c.id,
      c.id,
      "0f0f0f0f-0f0f-4f0f-8f0f-0f0f0f0f0f0f" as Uuid,
    ]);
    expect([...names]).toEqual([[c.id, ZZ.name]]);
    expect(await customerNames(stub.sql, owner, [])).toEqual(new Map());
    const many = Array.from({ length: 51 }, () => c.id);
    await expect(customerNames(stub.sql, owner, many)).rejects.toThrow(/at most 50/);
  });
});
