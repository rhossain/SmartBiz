/**
 * tests/integration/staff-screen.test.tsx — `/staff` in happy-dom (U3 W1, W3, W7; BR1.1,
 * BR9.1, BR9.2; NFR9.10; frontend-components "StaffScreen"; review D-02).
 *
 * The container (src/router/render-staff-route.tsx) runs over the real staff client and HTTP
 * client on a stubbed `fetch` whose bodies come from tests/spec/fixtures.ts, each parsed with
 * its shared schema first. Restated from the design:
 *   - two tables: the members and the pending invitations, each inside `.scroll-x`;
 *   - the invite form's role select lists exactly the server's `invitableRoles`;
 *   - a "রিসেট লিংক" button appears only where the server said `canReset`;
 *   - a 201 opens the link sheet with the server's link once; closing it removes the link
 *     from the page; after an invitation the list is read again;
 *   - a 409 on invite says "এই ইমেইল আগে থেকেই আছে"; a bad email is a message under the field;
 *   - Sales Staff (and Accountants) see the lock screen naming "কর্মী" and no staff request is
 *     sent (the client gate, BR1.1).
 */
import { afterEach, describe, expect, test } from "bun:test";
import * as React from "react";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import {
  InviteResponseSchema,
  ResetLinkResponseSchema,
  SessionResponseSchema,
  StaffListResponseSchema,
  type StaffListResponse,
} from "../../src/auth/schemas.js";
import { createAuthApi } from "../../src/client/auth-api.js";
import { createHttpClient } from "../../src/client/http.js";
import { createOrdersApi } from "../../src/client/orders-api.js";
import { createOrdersStore } from "../../src/client/orders-store.js";
import { createSessionStore } from "../../src/client/session-store.js";
import { createStaffApi } from "../../src/client/staff-api.js";
import { setLocale } from "../../src/i18n/useTranslations.js";
import { createOrderDraftStore } from "../../src/orders/order-draft.js";
import { App } from "../../src/router/App.js";
import { renderStaffRoute } from "../../src/router/render-staff-route.js";
import { INVITE_BODY, RESET_LINK_BODY, sessionBody, STAFF_LIST_BODY } from "../spec/fixtures.js";

const WAIT = { timeout: 3_000 };

const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });

const OWNER_LIST: StaffListResponse = StaffListResponseSchema.parse(STAFF_LIST_BODY);
/** The same business as a Manager sees it: two invitable roles; reset only for staff below. */
const MANAGER_LIST: StaffListResponse = StaffListResponseSchema.parse({
  ...STAFF_LIST_BODY,
  invitableRoles: ["sales_staff", "accountant"],
  members: STAFF_LIST_BODY.members.map((m) => ({
    ...m,
    canReset: m.role === "sales_staff" || m.role === "accountant",
  })),
});

type Answer = (init: RequestInit) => Response;

/** A fetch that answers per `METHOD path` and records every call. */
const stubFetch = (answers: Record<string, Answer>, calls: string[]): typeof fetch =>
  (async (input: string | URL | Request, init: RequestInit = {}) => {
    const method = init.method ?? "GET";
    const path = String(input).split("?")[0] ?? "";
    calls.push(`${method} ${path}`);
    const key = Object.keys(answers).find((k) => new RegExp(`^${k}$`).test(`${method} ${path}`));
    return key === undefined ? json(404, { error: "not_found" }) : (answers[key] as Answer)(init);
  }) as typeof fetch;

const mountStaff = (list: StaffListResponse, extra: Record<string, Answer> = {}) => {
  const calls: string[] = [];
  const staff = createStaffApi(
    createHttpClient({
      fetch: stubFetch({ "GET /api/staff": () => json(200, list), ...extra }, calls),
    }),
  );
  const view = render(
    renderStaffRoute({
      kind: "staff",
      locale: "bn",
      staff,
      homeTo: "/orders",
    }) as React.ReactElement,
  );
  return { view, calls };
};

afterEach(() => {
  cleanup();
  window.location.hash = "";
});

describe("/staff screen", () => {
  test("members and pending invitations, each table inside .scroll-x (BR9.1, NFR9.10)", async () => {
    setLocale("bn");
    const { view } = mountStaff(OWNER_LIST);
    await waitFor(() => expect(view.getAllByTestId("staff-member")).toHaveLength(4), WAIT);
    expect(view.getByTestId("screen-title").textContent).toBe("কর্মী");
    expect(view.getAllByTestId("staff-invitation")).toHaveLength(1);
    for (const id of ["staff-members", "staff-invitations"]) {
      expect(view.getByTestId(id).parentElement?.className).toBe("scroll-x");
    }
    const firstRow = view.getAllByTestId("staff-member")[0]?.textContent ?? "";
    expect(firstRow).toContain("owner@acme.test");
    expect(firstRow).toContain("মালিক");
  });

  test("the role select lists exactly invitableRoles (BR1.2)", async () => {
    setLocale("bn");
    const options = async (list: StaffListResponse): Promise<string[]> => {
      const { view } = mountStaff(list);
      await waitFor(() => expect(view.getByTestId("field-invite-role")).toBeDefined(), WAIT);
      const values = [...view.getByTestId("field-invite-role").querySelectorAll("option")].map(
        (o) => o.getAttribute("value") ?? "",
      );
      cleanup();
      return values;
    };
    expect(await options(OWNER_LIST)).toEqual(["manager", "sales_staff", "accountant"]);
    expect(await options(MANAGER_LIST)).toEqual(["sales_staff", "accountant"]);
  });

  test("a reset button only where canReset (BR1.3)", async () => {
    setLocale("bn");
    const { view } = mountStaff(MANAGER_LIST);
    await waitFor(() => expect(view.getAllByTestId("staff-member")).toHaveLength(4), WAIT);
    for (const m of MANAGER_LIST.members) {
      const shown = view.queryByTestId(`staff-reset-${m.id}`) !== null;
      expect({ role: m.role, shown }).toEqual({ role: m.role, shown: m.canReset });
    }
  });

  test("a reset link is shown once in the sheet and gone from the page on close (BR9.2)", async () => {
    setLocale("bn");
    const target = OWNER_LIST.members.find((m) => m.role === "sales_staff");
    const { view, calls } = mountStaff(OWNER_LIST, {
      "POST /api/staff/[^/]+/reset-links": () =>
        json(201, ResetLinkResponseSchema.parse(RESET_LINK_BODY)),
    });
    await waitFor(() => expect(view.getByTestId(`staff-reset-${target?.id}`)).toBeDefined(), WAIT);
    await act(async () => {
      fireEvent.click(view.getByTestId(`staff-reset-${target?.id}`));
    });
    await waitFor(() => expect(view.getByTestId("link-sheet")).toBeDefined(), WAIT);
    expect((view.getByTestId("link-sheet-link") as HTMLInputElement).value).toBe(
      RESET_LINK_BODY.link,
    );
    expect(calls).toContain(`POST /api/staff/${target?.id}/reset-links`);
    fireEvent.click(view.getByTestId("link-sheet-close"));
    expect(view.queryByTestId("link-sheet")).toBeNull();
    expect(document.body.innerHTML.includes(RESET_LINK_BODY.link)).toBe(false);
  });

  test("an invitation opens the sheet with its link and reloads the list", async () => {
    setLocale("bn");
    const sent: unknown[] = [];
    const { view, calls } = mountStaff(OWNER_LIST, {
      "POST /api/staff/invitations": (init) => {
        sent.push(JSON.parse(String(init.body)));
        return json(201, InviteResponseSchema.parse(INVITE_BODY));
      },
    });
    await waitFor(() => expect(view.getByTestId("staff-invite-form")).toBeDefined(), WAIT);
    fireEvent.change(view.getByTestId("field-invite-email"), {
      target: { value: "new.staff@acme.test" },
    });
    fireEvent.change(view.getByTestId("field-invite-role"), { target: { value: "accountant" } });
    await act(async () => {
      fireEvent.submit(view.getByTestId("staff-invite-form"));
    });
    await waitFor(() => expect(view.getByTestId("link-sheet")).toBeDefined(), WAIT);
    expect(sent).toEqual([{ email: "new.staff@acme.test", role: "accountant" }]);
    expect((view.getByTestId("link-sheet-link") as HTMLInputElement).value).toBe(INVITE_BODY.link);
    expect(calls.filter((c) => c === "GET /api/staff")).toHaveLength(2);
    expect((view.getByTestId("field-invite-email") as HTMLInputElement).value).toBe("");
  });

  test("409 says the email is already a member; a bad email goes under the field", async () => {
    setLocale("bn");
    let answer: Response = json(409, { error: "conflict" });
    const { view } = mountStaff(OWNER_LIST, { "POST /api/staff/invitations": () => answer });
    await waitFor(() => expect(view.getByTestId("staff-invite-form")).toBeDefined(), WAIT);
    fireEvent.change(view.getByTestId("field-invite-email"), {
      target: { value: "manager@acme.test" },
    });
    await act(async () => {
      fireEvent.submit(view.getByTestId("staff-invite-form"));
    });
    await waitFor(() => expect(view.getByTestId("staff-invite-error")).toBeDefined(), WAIT);
    expect(view.getByTestId("staff-invite-error").textContent).toBe("এই ইমেইল আগে থেকেই আছে");
    expect(view.queryByTestId("link-sheet")).toBeNull();
    answer = json(400, {
      error: "invalid_email",
      fields: [{ path: "email", message: "invalid_email" }],
    });
    await act(async () => {
      fireEvent.submit(view.getByTestId("staff-invite-form"));
    });
    await waitFor(() => expect(view.getByTestId("field-error-invite-email")).toBeDefined(), WAIT);
    expect(view.getByTestId("field-error-invite-email").textContent).toBe("সঠিক ইমেইল লিখুন");
  });

  test("Sales Staff and Accountants: the lock naming কর্মী, no staff request (BR1.1)", async () => {
    setLocale("bn");
    for (const role of ["sales_staff", "accountant"] as const) {
      await act(async () => {
        window.location.hash = "#/staff";
      });
      const calls: string[] = [];
      const http = createHttpClient({
        fetch: stubFetch(
          {
            "GET /api/session": () => json(200, SessionResponseSchema.parse(sessionBody(role))),
            "GET /api/staff": () => json(403, { error: "forbidden" }),
          },
          calls,
        ),
      });
      const view = render(
        <App
          deps={{
            http,
            auth: createAuthApi(http),
            orders: createOrdersApi(http),
            sessions: createSessionStore(),
            ordersStore: createOrdersStore(),
            draft: createOrderDraftStore(),
          }}
        />,
      );
      await waitFor(() => expect(view.getByTestId("lock-sheet")).toBeDefined(), WAIT);
      expect({
        role,
        names: (view.getByTestId("lock-sheet").textContent ?? "").includes("কর্মী"),
      }).toEqual({
        role,
        names: true,
      });
      expect({ role, staffCalls: calls.filter((c) => c.includes("/api/staff")) }).toEqual({
        role,
        staffCalls: [],
      });
      cleanup();
    }
  });
});
