/**
 * tests/unit/three-layer-gate-absence.test.ts — the client role walk, driven by the inline
 * role table (W6; BR1.1, BR1.2, BR2.1, BR3.2, BR3.4, BR3.5, BR4.1; S11, S12; NFR1.5–NFR1.8;
 * AC1.7.1, AC5.1.1, AC5.1.2, AC5.1.4, AC5.1.5; review D-04; R1.2 CI gate).
 *
 * The whole App is mounted in happy-dom for every screen row of tests/spec/role-table.ts and
 * every role (and with no session), on a stubbed `fetch` that answers from
 * tests/spec/fixtures.ts — each body parsed with its route's shared schema first — and that
 * applies the role table's API rows, as the server would. Restated:
 *   - the screen route map and the screen rows match exactly, both ways (BR3.2);
 *   - a role OUTSIDE a row sees the lock screen (`lock-sheet`) naming the row's feature, and
 *     no gated API path is requested while the route resolves (the client gate refuses
 *     before any call; the boot session probe `GET /api/session` is not the route's data);
 *   - a role INSIDE a row sees the row's heading and no error banner (never a blank screen);
 *   - with no session, every public row renders its heading (a redirecting row lands where
 *     the row says) and every gated row goes to sign-in;
 *   - the Owner never sees the lock screen (BR3.5), the audit trail and daily card included;
 *   - each role's navigation links are exactly the rows it may open that have a nav item, in
 *     order (BR2.1).
 * Failures name the role and the route (NFR8.14). It prints rows, roles, checks and its
 * duration (O12); gate step 5b times it (NFR6.16).
 */
import { afterAll, afterEach, describe, expect, test } from "bun:test";
import * as React from "react";
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { createAuthApi } from "../../src/client/auth-api.js";
import { createHttpClient } from "../../src/client/http.js";
import { createOrdersApi } from "../../src/client/orders-api.js";
import { createOrdersStore } from "../../src/client/orders-store.js";
import { createSessionStore } from "../../src/client/session-store.js";
import { setLocale } from "../../src/i18n/useTranslations.js";
import { createOrderDraftStore } from "../../src/orders/order-draft.js";
import { App } from "../../src/router/App.js";
import { routes } from "../../src/router/routes.js";
import { FIXTURE_ORDER_ID, parsedFixture, sessionBody } from "../spec/fixtures.js";
import {
  API_ROWS,
  apiKey,
  diffKeys,
  isAllowed,
  reportWalk,
  ROLES,
  SCREEN_ROWS,
  type Role,
  type ScreenRow,
} from "../spec/role-table.js";
import { SessionResponseSchema } from "../../src/auth/schemas.js";

const WALK = { timeout: 60_000 };
const WAIT = { timeout: 3_000 };
const started = performance.now();
let checks = 0;
const check = (): void => {
  checks += 1;
};

const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });

const API_PATTERNS = API_ROWS.map((row) => ({
  row,
  re: new RegExp(`^${row.path.replace(/:[a-zA-Z]+/g, "[^/]+")}$`),
}));

/** A browser `fetch` answered from the fixtures, gated by the role table's API rows. */
const stubFetch = (role: Role | null, calls: string[]): typeof fetch =>
  (async (input: string | URL | Request, init: RequestInit = {}) => {
    const url = String(input);
    const method = init.method ?? "GET";
    calls.push(`${method} ${url}`);
    const path = url.split("?")[0] ?? "";
    const hit = API_PATTERNS.find((p) => p.row.method === method && p.re.test(path));
    if (hit === undefined) return json(404, { error: "not_found" });
    if (hit.row.allowed !== "public") {
      if (role === null) return json(401, { error: "unauthenticated" });
      if (!isAllowed(hit.row.allowed, role)) return json(403, { error: "forbidden" });
    }
    const key = apiKey(hit.row);
    if (key === "GET /api/session" && role !== null) {
      return json(200, SessionResponseSchema.parse(sessionBody(role)));
    }
    const f = parsedFixture(key);
    return f.body === null ? new Response(null, { status: f.status }) : json(f.status, f.body);
  }) as typeof fetch;

const concrete = (path: string): string => path.replace(":id", FIXTURE_ORDER_ID);
const hash = (): string => window.location.hash.replace(/^#/, "");

/** Mount the App at `path` for `role` (null: no session); returns the view and the calls. */
const mount = async (path: string, role: Role | null) => {
  await act(async () => {
    window.location.hash = concrete(path);
  });
  const calls: string[] = [];
  const http = createHttpClient({ fetch: stubFetch(role, calls) });
  const deps = {
    http,
    auth: createAuthApi(http),
    orders: createOrdersApi(http),
    sessions: createSessionStore(),
    ordersStore: createOrdersStore(),
    draft: createOrderDraftStore(),
  };
  const view = render(React.createElement(App, { deps }));
  return { view, calls };
};

const gatedApi = (call: string): boolean => {
  const [method, url] = call.split(" ");
  const path = (url ?? "").split("?")[0] ?? "";
  const row = API_PATTERNS.find((p) => p.row.method === method && p.re.test(path))?.row;
  return row !== undefined && row.allowed !== "public" && apiKey(row) !== "GET /api/session";
};

const headingOf = (view: ReturnType<typeof render>, row: ScreenRow): string | null =>
  view.queryByTestId(row.headingTestId)?.textContent ?? null;

afterEach(() => {
  cleanup();
  window.location.hash = "";
});

afterAll(() => {
  reportWalk("client", SCREEN_ROWS.length, ROLES.length, checks, performance.now() - started);
});

describe("client role walk over the screen route map (role table, C5)", () => {
  test("the screen route map and the role table's screen rows match exactly (BR3.2)", () => {
    const d = diffKeys(
      [...routes.keys()],
      SCREEN_ROWS.map((r) => r.path),
    );
    check();
    expect(d).toEqual({ missingRow: [], notRegistered: [] });
    for (const row of SCREEN_ROWS) {
      const route = routes.get(row.path as never);
      check();
      expect({ path: row.path, public: route?.requiredCapability === null }).toEqual({
        path: row.path,
        public: row.allowed === "public",
      });
    }
  });

  test(
    "each role: the lock screen naming the feature outside its rows, the heading inside (BR3.4)",
    async () => {
      setLocale("bn");
      for (const row of SCREEN_ROWS.filter((r) => r.allowed !== "public")) {
        for (const role of ROLES) {
          const { view, calls } = await mount(row.path, role);
          if (isAllowed(row.allowed, role)) {
            await waitFor(() => expect(headingOf(view, row)).toBe(row.heading), WAIT).catch(() => {
              throw new Error(
                `${role} on ${row.path}: heading ${JSON.stringify(headingOf(view, row))}, expected ${row.heading}`,
              );
            });
            check();
            expect({ role, path: row.path, banner: view.queryByTestId("error-banner") }).toEqual({
              role,
              path: row.path,
              banner: null,
            });
            check();
            expect({ role, path: row.path, lock: view.queryByTestId("lock-sheet") }).toEqual({
              role,
              path: row.path,
              lock: null,
            });
          } else {
            await waitFor(() => expect(view.getByTestId("lock-sheet")).toBeDefined(), WAIT).catch(
              () => {
                throw new Error(`${role} on ${row.path}: no lock screen (hash ${hash()})`);
              },
            );
            const text = view.getByTestId("lock-sheet").textContent ?? "";
            check();
            expect({ role, path: row.path, namesFeature: text.includes(row.feature) }).toEqual({
              role,
              path: row.path,
              namesFeature: true,
            });
            check();
            expect({ role, path: row.path, gatedCalls: calls.filter(gatedApi) }).toEqual({
              role,
              path: row.path,
              gatedCalls: [],
            });
            check();
            expect(view.getByTestId("lock-home").getAttribute("href")).toBe("#/orders");
          }
          cleanup();
        }
      }
    },
    WALK,
  );

  test(
    "no session: public rows render their heading, gated rows go to sign-in (BR1.5)",
    async () => {
      setLocale("bn");
      for (const row of SCREEN_ROWS) {
        const { view } = await mount(row.path, null);
        if (row.allowed === "public") {
          await waitFor(() => expect(headingOf(view, row)).toBe(row.heading), WAIT).catch(() => {
            throw new Error(`no session on ${row.path}: heading ${headingOf(view, row)}`);
          });
          check();
          expect({ path: row.path, at: hash() }).toEqual({
            path: row.path,
            at: row.landsOn ?? row.path,
          });
        } else {
          await waitFor(() => expect(hash()).toBe("/sign-in"), WAIT);
          check();
          expect(view.queryByTestId("lock-sheet")).toBeNull();
        }
        cleanup();
      }
    },
    WALK,
  );

  test(
    "signed in, a public row still shows a named heading and never the lock (BR1.1)",
    async () => {
      setLocale("bn");
      for (const row of SCREEN_ROWS.filter((r) => r.allowed === "public" && r.path !== "/lock")) {
        for (const role of ROLES) {
          const { view } = await mount(row.path, role);
          await waitFor(
            () =>
              expect(
                (view.queryByTestId("screen-title")?.textContent ?? "").length,
              ).toBeGreaterThan(0),
            WAIT,
          );
          check();
          expect({ role, path: row.path, lock: view.queryByTestId("lock-sheet") }).toEqual({
            role,
            path: row.path,
            lock: null,
          });
          cleanup();
        }
      }
    },
    WALK,
  );

  test(
    "each role's navigation is exactly its allowed rows with a nav item, in order (BR2.1)",
    async () => {
      setLocale("bn");
      for (const role of ROLES) {
        const { view } = await mount("/orders", role);
        await waitFor(() => expect(view.getByTestId("shell-nav")).toBeDefined(), WAIT);
        const hrefs = [...view.getByTestId("shell-nav").querySelectorAll("a")].map(
          (a) => a.getAttribute("href") ?? "",
        );
        const expected = SCREEN_ROWS.filter((r) => r.nav && isAllowed(r.allowed, role)).map(
          (r) => `#${r.path}`,
        );
        check();
        expect({ role, hrefs }).toEqual({ role, hrefs: expected });
        cleanup();
      }
    },
    WALK,
  );

  test("inverse: the Owner reaches the audit trail and the daily card (BR3.5)", async () => {
    setLocale("bn");
    const trail = await mount("/audit-trail", "owner");
    await waitFor(() => expect(trail.view.getAllByTestId("audit-row")).toHaveLength(2), WAIT);
    check();
    expect(trail.view.queryByTestId("lock-sheet")).toBeNull();
    cleanup();
    const card = await mount("/daily-card", "owner");
    await waitFor(
      () => expect(card.view.getByTestId("screen-title").textContent).toBe("দৈনিক কার্ড"),
      WAIT,
    );
    check();
    // B5 built the card: the Owner gets its tiles, not the not-available message or a lock.
    await waitFor(() => expect(card.view.getByTestId("daily-orders")).toBeTruthy(), WAIT);
    expect(card.view.queryByTestId("lock-sheet")).toBeNull();
  });
});
