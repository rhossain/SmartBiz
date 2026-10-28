/**
 * tests/unit/shell.test.tsx — the Shell (BR8.6; FR4.1, FR2.4; AC5.2a.1).
 *
 * Restated: signed in, the header shows the email and the role in Bangla, and a sign-out
 * button that calls the handler (disabled while it runs); signed out it shows neither and no
 * navigation; the navigation lists only the routes the role can open (Accountant: no
 * business link; Owner: all five); no external font link is added to the page.
 * U2: the navigation is a prop built by App from the route map (F-01, S12), and the Shell
 * hosts the save toast (F-05).
 */
import { afterEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as React from "react";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { lookup } from "../../src/i18n/L.js";
import { setLocale } from "../../src/i18n/useTranslations.js";
import { Shell } from "../../src/pres/Shell.js";
import { homeFor, navFor } from "../../src/router/App.js";

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

  /*
   * U2 (F-01, S12; BR2.1, BR2.2): the Shell renders exactly the nav it is GIVEN; App builds
   * that list from the screen route map. The per-role lists below are restated from US5.1.
   */
  test("navigation: the Shell renders exactly the items it is given, each with its own label", () => {
    const view = render(
      <Shell
        locale="bn"
        onLocaleChange={() => undefined}
        user={{ email: "x@y.zz", role: "owner" }}
        nav={[
          { to: "/orders", label: "nav.orders" },
          { to: "/audit-trail", label: "nav.audit_trail" },
        ]}
      />,
    );
    const links = [...view.getByTestId("shell-nav").querySelectorAll("a")];
    expect(links.map((a) => a.getAttribute("href"))).toEqual(["#/orders", "#/audit-trail"]);
    expect(links.map((a) => a.textContent)).toEqual(["অর্ডার", "অডিট ট্রেইল"]);
    cleanup();
    const none = render(
      <Shell
        locale="bn"
        onLocaleChange={() => undefined}
        user={{ email: "x@y.zz", role: "owner" }}
      />,
    );
    expect(none.getByTestId("shell-nav").querySelectorAll("a")).toHaveLength(0);
  });

  test("navigation: App's list per role is what the role can open, labels all different", () => {
    const links = (role: "owner" | "manager" | "accountant" | "sales_staff"): string[] =>
      navFor(role).map((n) => `#${n.to}`);
    // U3 (BR10.1): "কর্মী" for the Owner and the Manager only.
    expect(links("owner")).toEqual([
      "#/orders",
      "#/daily-card",
      "#/audit-trail",
      "#/staff",
      "#/business",
      "#/settings",
    ]);
    expect(links("manager")).toEqual([
      "#/orders",
      "#/daily-card",
      "#/audit-trail",
      "#/staff",
      "#/settings",
    ]);
    expect(links("accountant")).toEqual([
      "#/orders",
      "#/daily-card",
      "#/audit-trail",
      "#/settings",
    ]);
    expect(links("sales_staff")).toEqual(["#/orders", "#/daily-card", "#/settings"]);
    const labels = navFor("owner").map((n) => lookup(n.label, "bn"));
    expect(new Set(labels).size).toBe(labels.length);
    expect(labels).toEqual(["অর্ডার", "দৈনিক কার্ড", "অডিট ট্রেইল", "কর্মী", "ব্যবসা", "সেটিংস"]);
    expect(labels.some((l) => l === "সংরক্ষণ")).toBe(false);
    expect(homeFor("sales_staff")).toBe("/orders");
  });

  test("the Shell hosts the toast it is given (F-05)", () => {
    const view = render(
      <Shell locale="bn" onLocaleChange={() => undefined} toast={<span>সংরক্ষণ হয়েছে</span>} />,
    );
    expect(view.getByTestId("shell-toast").textContent).toBe("সংরক্ষণ হয়েছে");
    cleanup();
    const quiet = render(<Shell locale="bn" onLocaleChange={() => undefined} />);
    expect(quiet.queryByTestId("shell-toast")).toBeNull();
  });

  test("the Shell imports no router, client or auth module (F-01)", () => {
    const source = readFileSync(join(import.meta.dir, "../../src/pres/Shell.tsx"), "utf8");
    const imports = source.split("\n").filter((l) => /^import /.test(l));
    expect(imports.filter((l) => /\/(router|client|auth)\//.test(l))).toEqual([]);
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
