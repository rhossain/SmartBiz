/**
 * tests/integration/audit-trail-screen.test.tsx — the audit trail screen in the running app
 * on the real request pipeline (happy-dom; SQL stub) (W4; BR4.2, BR7.5; O10; NFR8.10,
 * NFR9.5; AC5.1.1).
 *
 * Restated:
 *  - each entry shows its action's Bangla label (the raw action name when there is none), its
 *    time in Bangla digits, the actor's email or "সিস্টেম", its subject and correlation id;
 *  - "আরও দেখুন" appears while there is a next page and appends it (55 rows: 50, then 5);
 *  - an empty trail says "এখনো কোনো এন্ট্রি নেই";
 *  - Sales Staff opening /audit-trail get the lock screen naming "অডিট ট্রেইল" and no audit
 *    call is made; if the server refuses the call itself (403) the lock shows inside the
 *    screen (BR4.2).
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import * as React from "react";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { AuditTrail } from "../../src/audit/screens/AuditTrail.js";
import { createAuditApi } from "../../src/client/audit-api.js";
import { createOrdersStore } from "../../src/client/orders-store.js";
import { createSessionStore } from "../../src/client/session-store.js";
import type { Role } from "../../src/data/enums.js";
import { setLocale } from "../../src/i18n/useTranslations.js";
import { createOrderDraftStore } from "../../src/orders/order-draft.js";
import { App } from "../../src/router/App.js";
import { browserClient } from "../helpers/browser-fetch.js";
import { makeSqlStub } from "../helpers/sql-stub.js";
import { BUSINESS, harness, NOW, seedBusiness, userIdFor } from "../helpers/server-harness.js";

const YEAR = 365 * 24 * 60 * 60 * 1000;
const id = (n: number): string => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

const auditRow = (n: number, extra: Record<string, unknown> = {}): Record<string, unknown> => {
  const at = new Date(NOW.getTime() - n * 60_000).toISOString();
  return {
    id: id(n),
    business_id: BUSINESS,
    actor_user_id: userIdFor("owner"),
    correlation_id: `corr${String(n).padStart(12, "0")}`,
    action: "order.create",
    subject_kind: "order",
    subject_id: "0f0f0f0f-0f0f-4f0f-8f0f-0f0f0f0f0f0f",
    payload: "{}",
    reverses_id: null,
    occurred_at: at,
    retention_until: new Date(Date.parse(at) + 5 * YEAR).toISOString(),
    ...extra,
  };
};

const setup = async (rows: ReadonlyArray<Record<string, unknown>>, role: Role) => {
  const stub = makeSqlStub();
  const tokens = await seedBusiness(stub);
  stub.state.auditLog.push(...rows);
  const h = harness(stub);
  const client = browserClient(h);
  client.net.jar.token = tokens[role];
  return { client };
};

const mountApp = (client: ReturnType<typeof browserClient>) =>
  render(
    <App
      deps={{
        http: client.http,
        auth: client.auth,
        orders: client.orders,
        sessions: createSessionStore(),
        ordersStore: createOrdersStore(),
        draft: createOrderDraftStore(),
        audit: createAuditApi(client.http),
      }}
    />,
  );

beforeEach(async () => {
  setLocale("bn");
  await act(async () => {
    window.location.hash = "/audit-trail";
  });
});

afterEach(() => {
  cleanup();
  window.location.hash = "";
});

describe("the audit trail screen", () => {
  test("rows: Bangla label, Bangla digits, the actor or সিস্টেম, subject and correlation id", async () => {
    const { client } = await setup(
      [
        auditRow(1),
        auditRow(2, { actor_user_id: null, action: "auth.sign_in.failure", subject_kind: "user" }),
        auditRow(3, { action: "catalog.thing.unknown" }),
      ],
      "owner",
    );
    const view = mountApp(client);
    await waitFor(() => expect(view.getAllByTestId("audit-row")).toHaveLength(3));
    expect(view.getByTestId("screen-title").textContent).toBe("অডিট ট্রেইল");
    const actions = view.getAllByTestId("audit-action").map((c) => c.textContent);
    expect(actions).toEqual(["অর্ডার তৈরি", "সাইন ইন ব্যর্থ", "catalog.thing.unknown"]);
    const actors = view.getAllByTestId("audit-actor").map((c) => c.textContent);
    expect(actors).toEqual(["owner@acme.test", "সিস্টেম", "owner@acme.test"]);
    for (const cell of view.getAllByTestId("audit-time")) {
      const text = cell.textContent ?? "";
      expect({ text, ascii: /[0-9]/.test(text), bangla: /২০২৬/.test(text) }).toEqual({
        text,
        ascii: false,
        bangla: true,
      });
    }
    expect(view.getAllByTestId("audit-correlation")[0]?.textContent).toBe("corr000000000001");
    expect(view.getAllByTestId("audit-subject")[0]?.textContent).toBe("order 0f0f0f0f");
    expect(view.queryByTestId("audit-more")).toBeNull();
  });

  test("আরও দেখুন appends the next page and disappears on the last one", async () => {
    const rows = Array.from({ length: 55 }, (_, i) => auditRow(i + 1));
    const { client } = await setup(rows, "accountant");
    const view = mountApp(client);
    await waitFor(() => expect(view.getAllByTestId("audit-row")).toHaveLength(50));
    expect(view.getByTestId("audit-more").textContent).toBe("আরও দেখুন");
    await act(async () => {
      fireEvent.click(view.getByTestId("audit-more"));
    });
    await waitFor(() => expect(view.getAllByTestId("audit-row")).toHaveLength(55));
    const ids = view.getAllByTestId("audit-row").map((r) => r.getAttribute("data-entry-id"));
    expect(new Set(ids).size).toBe(55);
    expect(view.queryByTestId("audit-more")).toBeNull();
    const auditCalls = client.net.calls.filter((c) => c.path.startsWith("/api/audit"));
    expect(auditCalls).toHaveLength(2);
    expect(auditCalls[1]?.path).toMatch(/cursor=/);
  });

  test("an empty trail says এখনো কোনো এন্ট্রি নেই", async () => {
    const { client } = await setup([], "manager");
    const view = mountApp(client);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 350));
    });
    await waitFor(() => expect(view.getByTestId("audit-empty")).toBeDefined());
    expect(view.getByTestId("audit-empty").textContent).toBe("এখনো কোনো এন্ট্রি নেই");
  });

  test("Sales Staff: the lock screen naming the audit trail, and no audit call", async () => {
    const { client } = await setup([auditRow(1)], "sales_staff");
    const view = mountApp(client);
    await waitFor(() => expect(view.getByTestId("lock-sheet")).toBeDefined());
    expect(view.getByTestId("lock-feature").textContent).toBe("অডিট ট্রেইল");
    expect(view.getByTestId("lock-home").getAttribute("href")).toBe("#/orders");
    expect(client.net.calls.some((c) => c.path.startsWith("/api/audit"))).toBe(false);
  });

  test("a 403 from the server shows the lock inside the screen (BR4.2)", async () => {
    const { client } = await setup([auditRow(1)], "sales_staff");
    const audit = createAuditApi(client.http);
    const view = render(<AuditTrail locale="bn" load={audit.page} homeTo="/orders" />);
    await waitFor(() => expect(view.getByTestId("api-state-lock")).toBeDefined());
    expect(view.getByTestId("screen-title").textContent).toBe("অডিট ট্রেইল");
    expect(view.getByTestId("lock-feature").textContent).toBe("অডিট ট্রেইল");
  });

  test("a failed read offers retry, and retry loads the trail", async () => {
    const { client } = await setup([auditRow(1)], "owner");
    client.net.down = true;
    const audit = createAuditApi(client.http);
    const view = render(<AuditTrail locale="bn" load={audit.page} />);
    await waitFor(() => expect(view.getByTestId("error-banner")).toBeDefined());
    expect(view.getByTestId("error-banner").getAttribute("data-kind")).toBe("unreachable");
    client.net.down = false;
    await act(async () => {
      fireEvent.click(view.getByTestId("error-banner-retry"));
    });
    await waitFor(() => expect(view.getAllByTestId("audit-row")).toHaveLength(1));
  });

  test("G-05: a failed আরও দেখুন keeps the rows; retry asks for the same cursor", async () => {
    const rows = Array.from({ length: 55 }, (_, i) => auditRow(i + 1));
    const { client } = await setup(rows, "owner");
    const audit = createAuditApi(client.http);
    const view = render(<AuditTrail locale="bn" load={audit.page} />);
    await waitFor(() => expect(view.getAllByTestId("audit-row")).toHaveLength(50));
    client.net.down = true;
    await act(async () => {
      fireEvent.click(view.getByTestId("audit-more"));
    });
    await waitFor(() => expect(view.getByTestId("audit-more-error")).toBeDefined());
    // The 50 rows stay; the banner sits beside them with a retry; no second "more" button.
    expect(view.getAllByTestId("audit-row")).toHaveLength(50);
    expect(view.getByTestId("error-banner").getAttribute("data-kind")).toBe("unreachable");
    expect(view.queryByTestId("audit-more")).toBeNull();
    const before = client.net.calls.filter((c) => c.path.includes("cursor=")).length;
    client.net.down = false;
    await act(async () => {
      fireEvent.click(view.getByTestId("error-banner-retry"));
    });
    await waitFor(() => expect(view.getAllByTestId("audit-row")).toHaveLength(55));
    expect(view.queryByTestId("audit-more-error")).toBeNull();
    const cursorCalls = client.net.calls.filter((c) => c.path.includes("cursor="));
    // The retry used the same cursor (one more cursor call), never page 1 again.
    expect(cursorCalls).toHaveLength(before + 1);
    expect(new Set(cursorCalls.map((c) => c.path)).size).toBe(1);
  });
});
