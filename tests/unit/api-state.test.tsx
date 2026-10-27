/**
 * tests/unit/api-state.test.tsx — what a screen shows for one request (W2; BR4.2,
 * BR5.1–BR5.5; R7, R9, R10; NFR7.9, NFR7.10, NFR7.12, NFR7.13, NFR9.5, NFR9.8; AC5.4.1–
 * AC5.4.3).
 *
 * Restated, in Bangla by default:
 *  - nothing for the first 300 ms, then "লোড হচ্ছে…" (BR5.1);
 *  - unreachable → "সার্ভারের সাথে যোগাযোগ হচ্ছে না" with retry, and 503 → the database
 *    message with retry; pressing retry loads the data once the server answers (NFR7.9,
 *    NFR7.10);
 *  - 403 → the lock screen inside the screen, naming the feature (BR4.2);
 *  - 404 → the not-found message with a link home;
 *  - 409 → the conflict message with "আবার লোড করুন"; reloading keeps what was typed (R10);
 *  - 500 → the message with the correlation id;
 *  - 401 → ApiState renders nothing; the HTTP client's onUnauthenticated hook is what runs
 *    (one handoff, F-01);
 *  - `rate_limited` shows its minutes; a failed write offers retry only for the safe kinds;
 *  - every error view is role="alert" with a text label.
 */
import { afterEach, describe, expect, test } from "bun:test";
import * as React from "react";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { createHttpClient, type ApiFailure } from "../../src/client/http.js";
import type { ShownErrorKind } from "../../src/i18n/error-copy.js";
import { setLocale } from "../../src/i18n/useTranslations.js";
import { ApiState } from "../../src/pres/ApiState.js";
import { RequestState } from "../../src/pres/RequestState.js";

afterEach(() => cleanup());

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** A screen that loads through `load` and shows ApiState, as the app's screens do. */
const Screen = ({ load }: { readonly load: () => Promise<string | ApiFailure> }) => {
  const [phase, setPhase] = React.useState<"loading" | "error" | "ready">("loading");
  const [failure, setFailure] = React.useState<ApiFailure | null>(null);
  const [data, setData] = React.useState("");
  const run = React.useCallback(async () => {
    setPhase("loading");
    const r = await load();
    if (typeof r === "string") {
      setData(r);
      setPhase("ready");
    } else {
      setFailure(r);
      setPhase("error");
    }
  }, [load]);
  React.useEffect(() => {
    void run();
  }, [run]);
  return (
    <ApiState
      phase={phase}
      locale="bn"
      errorKind={failure?.kind ?? null}
      correlationId={failure?.correlationId ?? null}
      onRetry={() => void run()}
      feature="অডিট ট্রেইল"
      homeTo="/orders"
    >
      <p data-testid="data">{data}</p>
    </ApiState>
  );
};

const fail = (kind: ShownErrorKind, extra: Partial<ApiFailure> = {}): ApiFailure => ({
  ok: false,
  kind,
  status: null,
  fields: [],
  retryAfterMinutes: null,
  correlationId: null,
  ...extra,
});

describe("ApiState", () => {
  test("loading shows nothing for 300 ms, then the Bangla loading message (BR5.1)", async () => {
    setLocale("bn");
    const view = render(<ApiState phase="loading" locale="bn" />);
    await act(async () => {
      await sleep(200);
    });
    expect(view.queryByTestId("request-loading")).toBeNull();
    await act(async () => {
      await sleep(150);
    });
    expect(view.getByTestId("request-loading").textContent).toBe("লোড হচ্ছে…");
  });

  test("unreachable and 503: the message with retry; retry loads once the server answers", async () => {
    for (const [kind, text] of [
      ["unreachable", "সার্ভারের সাথে যোগাযোগ হচ্ছে না"],
      ["db_unavailable", "ডাটাবেস চালু নেই। কিছুক্ষণ পর আবার চেষ্টা করুন।"],
    ] as const) {
      let up = false;
      const view = render(<Screen load={async () => (up ? "এসেছে" : fail(kind))} />);
      await waitFor(() => expect(view.getByTestId("error-banner")).toBeDefined());
      expect(view.getByTestId("error-banner").getAttribute("role")).toBe("alert");
      expect(view.getByTestId("error-banner-message").textContent).toBe(text);
      expect(view.getByTestId("error-banner-label").textContent).toBe("ত্রুটি");
      up = true;
      await act(async () => {
        fireEvent.click(view.getByTestId("error-banner-retry"));
      });
      await waitFor(() => expect(view.getByTestId("data").textContent).toBe("এসেছে"));
      expect(view.queryByTestId("error-banner")).toBeNull();
      cleanup();
    }
  });

  test("403: the lock screen inside the screen, naming the feature, with a link home (BR4.2)", async () => {
    setLocale("bn");
    const view = render(<Screen load={async () => fail("forbidden")} />);
    await waitFor(() => expect(view.getByTestId("lock-sheet")).toBeDefined());
    expect(view.getByTestId("api-state-lock").getAttribute("role")).toBe("alert");
    expect(view.getByTestId("lock-message").textContent).toBe("এই অংশ আপনার দায়িত্বের বাইরে");
    expect(view.getByTestId("lock-feature").textContent).toBe("অডিট ট্রেইল");
    expect(view.getByTestId("lock-home").getAttribute("href")).toBe("#/orders");
  });

  test("404: the not-found message and a link home, no retry", async () => {
    const view = render(<Screen load={async () => fail("not_found")} />);
    await waitFor(() => expect(view.getByTestId("api-state-not-found")).toBeDefined());
    expect(view.getByTestId("error-banner-message").textContent).toBe("পাওয়া যায়নি");
    expect(view.getByTestId("api-state-home").getAttribute("href")).toBe("#/orders");
    expect(view.queryByTestId("error-banner-retry")).toBeNull();
  });

  test("409: the conflict message with reload; reloading keeps what was typed (R10)", async () => {
    let reloads = 0;
    const Form = () => {
      const [name, setName] = React.useState("");
      return (
        <form>
          <input data-testid="name" value={name} onChange={(e) => setName(e.target.value)} />
          <ApiState
            phase="error"
            locale="bn"
            errorKind="conflict"
            onReload={() => {
              reloads += 1;
            }}
          />
        </form>
      );
    };
    const view = render(<Form />);
    fireEvent.change(view.getByTestId("name"), { target: { value: "রিনা" } });
    expect(view.getByTestId("error-banner-message").textContent).toBe(
      "অন্য কেউ এটি বদলেছে, আবার লোড করুন",
    );
    expect(view.getByTestId("error-banner-reload").textContent).toBe("আবার লোড করুন");
    fireEvent.click(view.getByTestId("error-banner-reload"));
    expect(reloads).toBe(1);
    expect((view.getByTestId("name") as HTMLInputElement).value).toBe("রিনা");
    expect(view.queryByTestId("error-banner-retry")).toBeNull();
    cleanup();
    for (const kind of ["already_linked", "not_editable", "invalid_transition"] as const) {
      const v = render(
        <ApiState phase="error" locale="bn" errorKind={kind} onReload={() => undefined} />,
      );
      expect({ kind, reload: v.queryByTestId("error-banner-reload") !== null }).toEqual({
        kind,
        reload: true,
      });
      cleanup();
    }
  });

  test("500: the message carries the correlation id", () => {
    const view = render(
      <ApiState phase="error" locale="bn" errorKind="internal" correlationId="3f2a9c1d5e7b8a60" />,
    );
    expect(view.getByTestId("error-banner-message").textContent).toBe(
      "কিছু একটা ভুল হয়েছে (3f2a9c1d5e7b8a60)",
    );
  });

  test("401: ApiState renders nothing and the client's onUnauthenticated hook runs (F-01)", async () => {
    let hooked = 0;
    const http = createHttpClient({
      fetch: (async () =>
        new Response(JSON.stringify({ error: "unauthenticated" }), {
          status: 401,
        })) as unknown as typeof fetch,
    });
    http.onUnauthenticated(() => {
      hooked += 1;
    });
    const view = render(
      <Screen
        load={async () => {
          const r = await http.request("GET", "/api/audit");
          return r.ok ? "x" : r;
        }}
      />,
    );
    await waitFor(() => expect(hooked).toBe(1));
    await act(async () => {
      await sleep(10);
    });
    expect(view.container.innerHTML).toBe("");
  });

  test("rate_limited shows its minutes; a failed write offers retry only for safe kinds", () => {
    const limited = render(
      <ApiState phase="error" locale="bn" errorKind="rate_limited" retryAfterMinutes={7} />,
    );
    expect(limited.getByTestId("error-banner-message").textContent).toBe(
      "অনেকবার চেষ্টা হয়েছে। ৭ মিনিট পর আবার চেষ্টা করুন।",
    );
    cleanup();
    const write = (kind: ShownErrorKind) =>
      render(
        <ApiState
          phase="error"
          locale="bn"
          errorKind={kind}
          read={false}
          onRetry={() => undefined}
        />,
      );
    expect(write("internal").queryByTestId("error-banner-retry")).toBeNull();
    cleanup();
    expect(write("unreachable").getByTestId("error-banner-retry")).toBeDefined();
    cleanup();
    expect(write("invalid_input").queryByTestId("error-banner-retry")).toBeNull();
  });

  test("RequestState is the same component with U1's props; empty and ready pass through", () => {
    expect(RequestState).toBe(ApiState);
    const empty = render(<RequestState phase="empty" locale="bn" empty={<b>কিছু নেই</b>} />);
    expect(empty.getByTestId("request-empty").textContent).toBe("কিছু নেই");
    cleanup();
    const ready = render(
      <RequestState phase="ready" locale="en">
        <i data-testid="kid">ok</i>
      </RequestState>,
    );
    expect(ready.getByTestId("kid").textContent).toBe("ok");
    cleanup();
    const en = render(
      <ApiState phase="error" locale="en" errorKind="unreachable" onRetry={() => undefined} />,
    );
    expect(en.getByTestId("error-banner-message").textContent).toBe("Cannot reach the server");
    expect(en.getByTestId("error-banner-retry").textContent).toBe("Try again");
  });
});
