/**
 * tests/unit/business-settings-screens.test.tsx — the Business and Settings pages
 * (src/router/screens/Business.tsx, Settings.tsx, src/router/render-business-route.tsx;
 * mockups §17.2, §17.3), rendered in happy-dom.
 *
 * Rules restated:
 *   - Business: the saved values fill the form; Save is disabled until a field changes; only
 *     the changed fields are sent; an emptied phone or address is sent as null; a 400 puts the
 *     message under its field and keeps the typed values; another refusal shows the banner;
 *     a save shows "ব্যবসার তথ্য সংরক্ষণ হয়েছে"; the currency is read-only BDT.
 *   - Settings: the person's email and role are shown read-only; choosing a language saves it
 *     and, only when the server confirms, switches the app's language; a refusal keeps the
 *     language and shows the banner; "change password" leads to the reset flow.
 */
import { afterEach, describe, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { BusinessResponse } from "../../src/auth/schemas.js";
import type { BusinessApi, BusinessUpdate } from "../../src/client/business-api.js";
import type { ApiFailure } from "../../src/client/http.js";
import type { Locale } from "../../src/data/enums.js";
import {
  renderBusinessRoute,
  renderSettingsRoute,
} from "../../src/router/render-business-route.js";
import { BusinessScreen, changesOf, formOf } from "../../src/router/screens/Business.js";

const SAVED: BusinessResponse = {
  name: "রহিম ফ্যাশন হাউস",
  phone: "01711000000",
  address: "মিরপুর ১০, ঢাকা",
  locale: "bn",
};

const failure = (kind: ApiFailure["kind"], fields: ApiFailure["fields"] = []): ApiFailure => ({
  ok: false,
  kind,
  status: kind === "invalid_input" ? 400 : 503,
  fields,
  retryAfterMinutes: null,
  correlationId: null,
});

const input = (testId: string): HTMLInputElement => screen.getByTestId(testId) as HTMLInputElement;

afterEach(() => cleanup());

describe("Business page", () => {
  test("changesOf sends only what changed; emptied phone or address is null", () => {
    const saved = formOf(SAVED);
    expect(changesOf(saved, saved)).toEqual({});
    expect(changesOf(saved, { ...saved, phone: " ", address: "" })).toEqual({
      phone: null,
      address: null,
    });
    expect(changesOf(saved, { ...saved, name: " নতুন নাম ", locale: "en" })).toEqual({
      name: "নতুন নাম",
      locale: "en",
    });
  });

  test("the form shows the saved values; Save waits for a change; a save sends the change", async () => {
    const sent: unknown[] = [];
    render(
      <BusinessScreen
        locale="bn"
        phase="ready"
        failure={null}
        saved={SAVED}
        onRetry={() => {}}
        onSave={async (patch) => {
          sent.push(patch);
          return null;
        }}
      />,
    );
    expect(input("field-business-name").value).toBe("রহিম ফ্যাশন হাউস");
    expect(input("field-business-currency").readOnly).toBe(true);
    const save = screen.getByTestId("business-save") as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    fireEvent.change(input("field-business-phone"), { target: { value: "01811000000" } });
    expect(save.disabled).toBe(false);
    await act(async () => {
      fireEvent.submit(screen.getByTestId("business-form"));
    });
    expect(sent).toEqual([{ phone: "01811000000" }]);
    expect(screen.getByTestId("business-saved").textContent).toBe("ব্যবসার তথ্য সংরক্ষণ হয়েছে");
  });

  test("a 400 puts the message under the phone and keeps the typed value", async () => {
    render(
      <BusinessScreen
        locale="bn"
        phase="ready"
        failure={null}
        saved={SAVED}
        onRetry={() => {}}
        onSave={async () => failure("invalid_input", [{ path: "phone", message: "invalid phone" }])}
      />,
    );
    fireEvent.change(input("field-business-phone"), { target: { value: "12345" } });
    await act(async () => {
      fireEvent.submit(screen.getByTestId("business-form"));
    });
    expect(input("field-business-phone").value).toBe("12345");
    expect(screen.getByText("০১ দিয়ে শুরু ১১ সংখ্যার মোবাইল নম্বর লিখুন")).toBeDefined();
  });

  test("another refusal shows the error banner", async () => {
    render(
      <BusinessScreen
        locale="en"
        phase="ready"
        failure={null}
        saved={SAVED}
        onRetry={() => {}}
        onSave={async () => failure("db_unavailable")}
      />,
    );
    fireEvent.change(input("field-business-name"), { target: { value: "X" } });
    await act(async () => {
      fireEvent.submit(screen.getByTestId("business-form"));
    });
    expect(screen.getByTestId("error-banner").getAttribute("data-kind")).toBe("db_unavailable");
  });

  test("the container loads the details, then saves through the client", async () => {
    const updates: BusinessUpdate[] = [];
    const api: BusinessApi = {
      get: async () => ({ ok: true, status: 200, value: SAVED }),
      update: async (patch) => {
        updates.push(patch);
        return { ok: true, status: 200, value: { ...SAVED, ...patch } as BusinessResponse };
      },
      setMyLocale: async (locale) => ({ ok: true, status: 200, value: { locale } }),
    };
    render(renderBusinessRoute({ kind: "business", locale: "en", business: api })!);
    await waitFor(() => expect(input("field-business-name").value).toBe(SAVED.name));
    fireEvent.change(input("field-business-address"), { target: { value: "উত্তরা, ঢাকা" } });
    await act(async () => {
      fireEvent.submit(screen.getByTestId("business-form"));
    });
    expect(updates).toEqual([{ address: "উত্তরা, ঢাকা" }]);
    await waitFor(() => expect(input("field-business-address").value).toBe("উত্তরা, ঢাকা"));
  });
});

describe("Settings page", () => {
  const api = (answer: "ok" | "fail", calls: Locale[]): BusinessApi => ({
    get: async () => ({ ok: true, status: 200, value: SAVED }),
    update: async () => ({ ok: true, status: 200, value: SAVED }),
    setMyLocale: async (locale) => {
      calls.push(locale);
      return answer === "ok"
        ? { ok: true, status: 200, value: { locale } }
        : failure("db_unavailable");
    },
  });

  test("email and role are shown; change password leads to the reset flow", () => {
    render(
      renderSettingsRoute({
        kind: "settings",
        locale: "bn",
        business: api("ok", []),
        email: "manager@shop.test",
        role: "manager",
        applyLocale: () => {},
      })!,
    );
    expect(screen.getByTestId("settings-email").textContent).toContain("manager@shop.test");
    expect(screen.getByTestId("settings-role").textContent).toBe("(ম্যানেজার)");
    expect(screen.getByTestId("settings-change-password").getAttribute("href")).toBe("#/recover");
  });

  test("choosing English saves it, then switches the app's language", async () => {
    const calls: Locale[] = [];
    const applied: Locale[] = [];
    render(
      renderSettingsRoute({
        kind: "settings",
        locale: "bn",
        business: api("ok", calls),
        email: "o@shop.test",
        role: "owner",
        applyLocale: (l: Locale) => applied.push(l),
      })!,
    );
    await act(async () => {
      fireEvent.click(screen.getByTestId("settings-language-en"));
    });
    expect({ calls, applied }).toEqual({ calls: ["en"], applied: ["en"] });
    expect(screen.getByTestId("settings-saved")).toBeDefined();
  });

  test("a refused save keeps the language and shows the banner", async () => {
    const applied: Locale[] = [];
    render(
      renderSettingsRoute({
        kind: "settings",
        locale: "bn",
        business: api("fail", []),
        email: "o@shop.test",
        role: "owner",
        applyLocale: (l: Locale) => applied.push(l),
      })!,
    );
    await act(async () => {
      fireEvent.click(screen.getByTestId("settings-language-en"));
    });
    expect(applied).toEqual([]);
    expect(screen.getByTestId("error-banner")).toBeDefined();
  });
});
