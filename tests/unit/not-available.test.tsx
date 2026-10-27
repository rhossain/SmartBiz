/**
 * tests/unit/not-available.test.tsx — the not-available screen and the lock screen's way home
 * (BR1.1, BR4.1; AC1.7.1, AC5.1.6; NFR9.5).
 *
 * Restated: a route whose feature is not built renders a real screen — its heading
 * (`screen-title`) is the feature's name, it says "এই অংশ পরের সংস্করণে আসবে" and links
 * "হোমে যান" to `#/`; every not-available route of the map renders it with its own name; the
 * lock screen names the missing feature and links to the role's first screen.
 */
import { afterEach, describe, expect, test } from "bun:test";
import * as React from "react";
import { cleanup, render } from "@testing-library/react";
import { setLocale } from "../../src/i18n/useTranslations.js";
import { LockScreen } from "../../src/pres/Lock.js";
import { NotAvailableScreen } from "../../src/pres/NotAvailable.js";
import { routes } from "../../src/router/routes.js";
import { renderLock } from "../../src/router/screens/render-auth-route.js";

afterEach(() => {
  cleanup();
  setLocale("bn");
});

describe("not-available screen", () => {
  test("heading is the feature's name; the message and the home link are in Bangla", () => {
    setLocale("bn");
    const view = render(<NotAvailableScreen featureKey="feature.daily_card" />);
    expect(view.getByTestId("screen-title").textContent).toBe("দৈনিক কার্ড");
    expect(view.getByTestId("not-available-message").textContent).toBe("এই অংশ পরের সংস্করণে আসবে");
    expect(view.getByTestId("not-available-home").textContent).toBe("হোমে যান");
    expect(view.getByTestId("not-available-home").getAttribute("href")).toBe("#/");
  });

  test("English is the second language", () => {
    setLocale("en");
    const view = render(<NotAvailableScreen featureKey="feature.settings" />);
    expect(view.getByTestId("screen-title").textContent).toBe("Settings");
    expect(view.getByTestId("not-available-message").textContent).toBe(
      "This part arrives in a later release",
    );
  });

  test("each not-yet-built route of the map renders it with its own name (BR1.1)", () => {
    setLocale("bn");
    const expected: Record<string, string> = {
      "/daily-card": "দৈনিক কার্ড",
      "/business": "ব্যবসা",
      "/settings": "সেটিংস",
      "/accept-invite": "আমন্ত্রণ গ্রহণ",
      "/reset": "নতুন পাসওয়ার্ড",
      "/recover": "পাসওয়ার্ড পুনরুদ্ধার",
    };
    for (const [path, name] of Object.entries(expected)) {
      const route = routes.get(path as never);
      const view = render(route?.render(undefined) as React.ReactElement);
      expect({ path, title: view.getByTestId("screen-title").textContent }).toEqual({
        path,
        title: name,
      });
      expect(view.getByTestId("not-available-message")).toBeDefined();
      cleanup();
    }
  });
});

describe("lock screen (BR4.1)", () => {
  test("names the missing feature and links to the role's first screen", () => {
    setLocale("bn");
    const view = render(<LockScreen feature="অডিট ট্রেইল" homeTo="/orders" />);
    expect(view.getByTestId("lock-message").textContent).toBe("এই অংশ আপনার দায়িত্বের বাইরে");
    expect(view.getByTestId("lock-feature").textContent).toBe("অডিট ট্রেইল");
    expect(view.getByTestId("lock-home").textContent).toBe("হোমে যান");
    expect(view.getByTestId("lock-home").getAttribute("href")).toBe("#/orders");
  });

  test("without a feature or home it still renders the lock message (direct /lock)", () => {
    const view = render(renderLock(undefined));
    expect(view.getByTestId("lock-sheet")).toBeDefined();
    expect(view.queryByTestId("lock-feature")).toBeNull();
    expect(view.queryByTestId("lock-home")).toBeNull();
  });
});
