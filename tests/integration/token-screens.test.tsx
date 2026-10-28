/**
 * tests/integration/token-screens.test.tsx — `/accept-invite`, `/reset` and `/recover` in
 * happy-dom (U3 W2, W5, W6; BR7.1, BR9.3–BR9.5; S24; NFR5.8; review D-02; scenario S10).
 *
 * Restated from the design:
 *   - the container reads `t` from the address bar and, in its first effect, replaces the
 *     entry with `#/accept-invite` (or `#/reset`) BEFORE it sends any request: a stubbed
 *     `fetch` records `location.hash` at every call, and no recorded hash and no request URL
 *     carries the token — it travels only in the POST body;
 *   - a link without a token shows "লিংকটি আর কাজ করে না; নতুন লিংক চান" and sends nothing;
 *     a 410 shows the same message and removes the form;
 *   - accept (201) refreshes the session and opens the orders list; reset (204) opens
 *     sign-in with "পাসওয়ার্ড বদলানো হয়েছে; নতুন পাসওয়ার্ড দিয়ে সাইন ইন করুন";
 *   - recover always ends on the neutral sentence — after a 202 and after a network failure —
 *     and refuses only an email that is not an email, without sending anything.
 * Containers run over the real staff and HTTP clients; the full App is mounted for the
 * navigation cases, with fixture bodies parsed by their shared schemas.
 */
import { afterEach, describe, expect, test } from "bun:test";
import * as React from "react";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { AcceptInviteResponseSchema, SessionResponseSchema } from "../../src/auth/schemas.js";
import { createAuthApi } from "../../src/client/auth-api.js";
import { createHttpClient } from "../../src/client/http.js";
import { createOrdersApi } from "../../src/client/orders-api.js";
import { createOrdersStore } from "../../src/client/orders-store.js";
import { createSessionStore } from "../../src/client/session-store.js";
import { createStaffApi } from "../../src/client/staff-api.js";
import { setLocale } from "../../src/i18n/useTranslations.js";
import { createOrderDraftStore } from "../../src/orders/order-draft.js";
import { App } from "../../src/router/App.js";
import {
  renderAcceptInvite,
  renderRecover,
  renderReset,
  type TokenRouteState,
} from "../../src/router/render-token-routes.js";
import { parsedFixture, sessionBody } from "../spec/fixtures.js";

const WAIT = { timeout: 3_000 };
/** A well-formed token, made up for the test: the server is a stub. */
const TOKEN = "TestTokenOnly-0123456789abcdefghijklmnopqrs";
const GONE_TEXT = "লিংকটি আর কাজ করে না; নতুন লিংক চান";

const json = (status: number, body: unknown): Response =>
  new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });

interface Call {
  readonly method: string;
  readonly url: string;
  readonly hashAtCall: string;
  readonly body: string;
}

type Answer = () => Response | Promise<Response>;

const stubFetch = (answers: Record<string, Answer>, calls: Call[]): typeof fetch =>
  (async (input: string | URL | Request, init: RequestInit = {}) => {
    const method = init.method ?? "GET";
    const url = String(input);
    calls.push({ method, url, hashAtCall: window.location.hash, body: String(init.body ?? "") });
    const answer = answers[`${method} ${url.split("?")[0] ?? ""}`];
    if (answer === undefined) return json(404, { error: "not_found" });
    return answer();
  }) as typeof fetch;

const setHash = async (hash: string): Promise<void> => {
  await act(async () => {
    window.location.hash = hash;
  });
};

/** A container with its own staff client; records what App would be asked to do. */
const container = (
  render_: (s: unknown) => React.ReactElement | null,
  answers: Record<string, Answer>,
) => {
  const calls: Call[] = [];
  const done: string[] = [];
  const state: TokenRouteState = {
    kind: "token",
    staff: createStaffApi(createHttpClient({ fetch: stubFetch(answers, calls) })),
    onAccepted: async () => {
      done.push("accepted");
    },
    onPasswordChanged: () => {
      done.push("password_changed");
    },
    navigate: (to) => {
      done.push(`navigate ${to}`);
    },
  };
  const view = render(render_(state) as React.ReactElement);
  return { view, calls, done };
};

const typePasswords = (view: ReturnType<typeof render>, password = "brand-new-pass-1"): void => {
  fireEvent.change(view.getByTestId("field-password"), { target: { value: password } });
  fireEvent.change(view.getByTestId("field-confirm"), { target: { value: password } });
};

const mountApp = (answers: Record<string, Answer>) => {
  const calls: Call[] = [];
  const http = createHttpClient({ fetch: stubFetch(answers, calls) });
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
  return { view, calls };
};

afterEach(() => {
  cleanup();
  window.location.hash = "";
});

describe("token screens (BR7.1, NFR5.8)", () => {
  test("accept: t leaves the address bar before the first request; the token only in the body", async () => {
    setLocale("bn");
    await setHash(`#/accept-invite?t=${TOKEN}`);
    const { view, calls, done } = container(renderAcceptInvite, {
      "POST /api/invitations/accept": () =>
        json(201, AcceptInviteResponseSchema.parse(sessionBody("sales_staff").user)),
    });
    expect(window.location.hash).toBe("#/accept-invite");
    expect(calls).toEqual([]);
    typePasswords(view);
    await act(async () => {
      fireEvent.click(view.getByTestId("accept-submit"));
    });
    await waitFor(() => expect(done).toEqual(["accepted", "navigate /orders"]), WAIT);
    expect(calls.map((c) => [c.method, c.url, c.hashAtCall])).toEqual([
      ["POST", "/api/invitations/accept", "#/accept-invite"],
    ]);
    expect(JSON.parse(calls[0]?.body ?? "{}")).toEqual({
      token: TOKEN,
      password: "brand-new-pass-1",
    });
    expect(calls.some((c) => c.url.includes(TOKEN) || c.hashAtCall.includes(TOKEN))).toBe(false);
    expect(document.body.innerHTML.includes(TOKEN)).toBe(false);
  });

  test("no token in the link: the gone message at once, nothing sent (BR9.3)", async () => {
    setLocale("bn");
    for (const [hash, render_, id] of [
      ["#/accept-invite", renderAcceptInvite, "accept"],
      ["#/reset?t=", renderReset, "reset"],
    ] as const) {
      await setHash(hash);
      const { view, calls } = container(render_, {});
      expect(view.getByTestId(`${id}-gone`).textContent).toBe(GONE_TEXT);
      expect(view.queryByTestId(`${id}-form`)).toBeNull();
      expect(calls).toEqual([]);
      cleanup();
    }
  });

  test("a 410 shows the gone message and removes the form (BR9.3)", async () => {
    setLocale("bn");
    await setHash(`#/reset?t=${TOKEN}`);
    const { view, done } = container(renderReset, {
      "POST /api/auth/reset": () => json(410, { error: "gone" }),
    });
    typePasswords(view);
    await act(async () => {
      fireEvent.click(view.getByTestId("reset-submit"));
    });
    await waitFor(() => expect(view.getByTestId("reset-gone").textContent).toBe(GONE_TEXT), WAIT);
    expect(view.queryByTestId("reset-form")).toBeNull();
    expect(done).toEqual([]);
  });

  test("reset: 204 signs this tab out and opens sign-in with the notice (BR9.5)", async () => {
    setLocale("bn");
    await setHash(`#/reset?t=${TOKEN}`);
    const { view, calls } = mountApp({
      "GET /api/session": () => json(401, { error: "unauthenticated" }),
      "GET /api/setup": () => json(200, { businessExists: true }),
      "POST /api/auth/reset": () => new Response(null, { status: 204 }),
    });
    await waitFor(() => expect(view.getByTestId("reset-form")).toBeDefined(), WAIT);
    expect(window.location.hash).toBe("#/reset");
    typePasswords(view);
    await act(async () => {
      fireEvent.click(view.getByTestId("reset-submit"));
    });
    await waitFor(() => expect(window.location.hash).toBe("#/sign-in"), WAIT);
    await waitFor(
      () =>
        expect(view.getByTestId("sign-in-password-changed").textContent).toBe(
          "পাসওয়ার্ড বদলানো হয়েছে; নতুন পাসওয়ার্ড দিয়ে সাইন ইন করুন",
        ),
      WAIT,
    );
    const post = calls.find((c) => c.url === "/api/auth/reset");
    expect(post?.hashAtCall).toBe("#/reset");
    expect(calls.some((c) => c.url.includes(TOKEN))).toBe(false);
  });

  test("accept in the App: signed in, then the orders list (BR9.5)", async () => {
    setLocale("bn");
    await setHash(`#/accept-invite?t=${TOKEN}`);
    let signedIn = false;
    const { view, calls } = mountApp({
      "GET /api/session": () =>
        signedIn
          ? json(200, SessionResponseSchema.parse(sessionBody("sales_staff")))
          : json(401, { error: "unauthenticated" }),
      "GET /api/setup": () => json(200, { businessExists: true }),
      "POST /api/invitations/accept": () => {
        signedIn = true;
        return json(201, AcceptInviteResponseSchema.parse(sessionBody("sales_staff").user));
      },
      "GET /api/orders": () => json(200, parsedFixture("GET /api/orders").body),
    });
    await waitFor(() => expect(view.getByTestId("accept-form")).toBeDefined(), WAIT);
    typePasswords(view);
    await act(async () => {
      fireEvent.click(view.getByTestId("accept-submit"));
    });
    await waitFor(() => expect(window.location.hash).toBe("#/orders"), WAIT);
    await waitFor(() => expect(view.getByTestId("screen-title").textContent).toBe("অর্ডার"), WAIT);
    const post = calls.find((c) => c.url === "/api/invitations/accept");
    expect(post?.hashAtCall).toBe("#/accept-invite");
    expect(calls.some((c) => c.url.includes(TOKEN))).toBe(false);
  });

  test("recover: the neutral sentence after a 202 and after a network failure (BR9.4)", async () => {
    setLocale("bn");
    for (const answer of [
      () => new Response(null, { status: 202 }),
      () => Promise.reject(new Error("offline")),
    ] as const) {
      const { view, calls } = container(renderRecover, {
        "POST /api/auth/recover": answer as Answer,
      });
      fireEvent.change(view.getByTestId("field-email"), { target: { value: " Owner@Acme.test " } });
      await act(async () => {
        fireEvent.click(view.getByTestId("recover-submit"));
      });
      await waitFor(
        () =>
          expect(view.getByTestId("recover-neutral").textContent).toBe(
            "আপনার মালিক বা এই কম্পিউটারের টার্মিনাল থেকে রিসেট লিংক নিন",
          ),
        WAIT,
      );
      expect(JSON.parse(calls[0]?.body ?? "{}")).toEqual({ email: "owner@acme.test" });
      expect(view.getByTestId("recover-sign-in").getAttribute("href")).toBe("#/sign-in");
      expect(document.body.innerHTML.includes("t=")).toBe(false);
      cleanup();
    }
  });

  test("recover refuses only a non-email, under the field, and sends nothing", async () => {
    setLocale("bn");
    const { view, calls } = container(renderRecover, {});
    fireEvent.change(view.getByTestId("field-email"), { target: { value: "not an email" } });
    // The browser's own type="email" check would stop a click; submit past it to reach ours.
    await act(async () => {
      fireEvent.submit(view.getByTestId("recover-form"));
    });
    expect(view.getByTestId("field-error-email").textContent).toBe("সঠিক ইমেইল লিখুন");
    expect(calls).toEqual([]);
  });
});
