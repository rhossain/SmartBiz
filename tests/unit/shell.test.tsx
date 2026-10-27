/**
 * tests/unit/shell.test.tsx — the Shell (BR8.6; FR4.1, FR2.4; AC5.2a.1).
 *
 * Restated: signed in, the header shows the email and the role in Bangla, and a sign-out
 * button that calls the handler (disabled while it runs); signed out it shows neither and no
 * navigation; the navigation lists only the routes the role can open (Accountant: no
 * business link; Owner: all five); no external font link is added to the page.
 */
import { afterEach, describe, expect, test } from "bun:test";
import * as React from "react";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { setLocale } from "../../src/i18n/useTranslations.js";
import { Shell } from "../../src/pres/Shell.js";

afterEach(() => cleanup());

describe("Shell", () => {
  test("signed in: email, role and a sign-out that calls the handler", () => {
    setLocale("bn");
    let signedOut = 0;
    const view = render(
      <Shell
        locale="bn"
        onLocaleChange={() => undefined}
        user={{ email: "owner@acme.test", role: "owner" }}
        onSignOut={() => {
          signedOut += 1;
        }}
      />,
    );
    expect(view.getByTestId("user-email").textContent).toBe("owner@acme.test");
    expect(view.getByTestId("user-role").textContent).toBe("মালিক");
    expect(view.getByTestId("sign-out").textContent).toBe("সাইন আউট");
    fireEvent.click(view.getByTestId("sign-out"));
    expect(signedOut).toBe(1);
  });

  test("the sign-out button is disabled while sign-out runs", () => {
    const view = render(
      <Shell
        locale="en"
        onLocaleChange={() => undefined}
        user={{ email: "a@b.cd", role: "manager" }}
        onSignOut={() => undefined}
        signingOut
      />,
    );
    expect((view.getByTestId("sign-out") as HTMLButtonElement).disabled).toBe(true);
    expect(view.getByTestId("user-role").textContent).toBe("Manager");
  });

  test("signed out: no email, no role, no navigation", () => {
    const view = render(<Shell locale="bn" onLocaleChange={() => undefined} user={null} />);
    expect(view.queryByTestId("user-info")).toBeNull();
    expect(view.queryByTestId("shell-nav")).toBeNull();
  });

  test("navigation lists only what the role can open", () => {
    const links = (role: "owner" | "accountant" | "sales_staff"): string[] => {
      const view = render(
        <Shell locale="en" onLocaleChange={() => undefined} user={{ email: "x@y.zz", role }} />,
      );
      const hrefs = [...view.getByTestId("shell-nav").querySelectorAll("a")].map(
        (a) => a.getAttribute("href") ?? "",
      );
      cleanup();
      return hrefs;
    };
    expect(links("owner")).toEqual([
      "#/orders",
      "#/daily-card",
      "#/audit-trail",
      "#/business",
      "#/settings",
    ]);
    expect(links("accountant")).toEqual([
      "#/orders",
      "#/daily-card",
      "#/audit-trail",
      "#/settings",
    ]);
    expect(links("sales_staff")).toEqual(["#/orders", "#/daily-card", "#/settings"]);
  });

  test("the language switch calls back; no external font link is added", () => {
    const picked: string[] = [];
    const view = render(<Shell locale="bn" onLocaleChange={(l) => picked.push(l)} />);
    fireEvent.change(view.getByTestId("locale-select"), { target: { value: "en" } });
    expect(picked).toEqual(["en"]);
    const external = [...document.head.querySelectorAll("link")].filter((l) =>
      /^https?:/.test(l.getAttribute("href") ?? ""),
    );
    expect(external).toHaveLength(0);
  });
});
