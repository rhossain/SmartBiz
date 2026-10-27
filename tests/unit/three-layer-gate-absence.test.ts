/**
 * tests/unit/three-layer-gate-absence.test.ts — R1.2 CI gate.
 * Asserts the three-layer gate is present on EVERY U1 route,
 * the Owner reaches audit trail + daily card (inverse), and
 * the absence of a gate on a route causes a redirect to /lock.
 */
import { describe, expect, test } from "bun:test";
import { routes } from "../../src/router/routes.js";
import { dispatch, dispatchPath } from "../../src/router/dispatch.js";
import { capabilitiesFor } from "../../src/auth/capability.js";
import type { Role } from "../../src/data/enums.js";

describe("R1.2 — three-layer gate absence", () => {
  test("(1) every U1 route has a gate (or is explicitly public)", () => {
    for (const [path, route] of routes) {
      // Public routes: /, /sign-in, /sign-up, /recover, /reset, /accept, /lock, /not-found (U1).
      const isPublic = [
        "/",
        "/sign-in",
        "/sign-up",
        "/recover",
        "/reset",
        "/accept",
        "/lock",
        "/not-found",
      ].includes(path);
      if (isPublic) {
        expect(route.requiredCapability).toBeNull();
      } else {
        expect(route.requiredCapability).not.toBeNull();
      }
    }
  });

  // (2) and (3) drive the real `dispatch()` through window.location.hash
  // (happy-dom), so the hash-reading path is exercised, not just the gate.
  // Review L-03: they previously discarded the outcome (`void o`).
  const atHash = <T>(hash: string, fn: () => T): T => {
    const before = window.location.hash;
    window.location.hash = hash;
    try {
      return fn();
    } finally {
      window.location.hash = before;
    }
  };

  test("(2) Owner reaches audit trail + daily card (inverse)", () => {
    expect(capabilitiesFor("owner").has("audit.view")).toBe(true);
    const ownerSession = {
      userId: "u",
      businessId: "b",
      role: "owner" as const,
      expiresAt: 1_000_000,
    };
    for (const path of ["/audit-trail", "/daily-card"] as const) {
      const o = atHash(`#${path}`, () => dispatch(ownerSession, 1, undefined));
      expect(o.kind === "render" && o.path).toBe(path);
    }
  });

  test("(3) a role without the route's capability is redirected to /lock, not rendered", () => {
    const salesStaffSession = {
      userId: "u",
      businessId: "b",
      role: "sales_staff" as const,
      expiresAt: 1_000_000,
    };
    expect(capabilitiesFor("sales_staff").has("business.edit")).toBe(false);
    const o = atHash("#/business", () => dispatch(salesStaffSession, 1, undefined));
    expect(o).toMatchObject({
      kind: "redirect",
      to: "/lock",
      reason: { kind: "forbidden", capability: "business.edit" },
    });
    const anon = atHash("#/audit-trail", () => dispatch(null, 1, undefined));
    expect(anon).toMatchObject({ kind: "redirect", to: "/sign-in" });
  });
});

/*
 * B2 extension: gating by ABSENCE over every U1 + U3 route (NFR6.6, FR12.4).
 *
 * The expected reach of every role is restated inline below and every
 * registered route is walked through the real dispatcher. A route that
 * exists in the registry but not in this table fails the test, so a new
 * route cannot ship ungated or unreviewed; a role that reaches a route
 * the table says it must not reach fails it too.
 */
const ORDER_ID = "0f0f0f0f-0f0f-4f0f-8f0f-0f0f0f0f0f0f";
const ROLES: ReadonlyArray<Role> = ["owner", "manager", "sales_staff", "accountant"];
const PUBLIC = "public";
const REACH: Readonly<Record<string, ReadonlyArray<Role> | typeof PUBLIC>> = {
  "/": PUBLIC,
  "/sign-in": PUBLIC,
  "/sign-up": PUBLIC,
  "/recover": PUBLIC,
  "/reset": PUBLIC,
  "/accept": PUBLIC,
  "/lock": PUBLIC,
  "/not-found": PUBLIC,
  "/orders": ["owner", "manager", "sales_staff", "accountant"],
  "/orders/:id": ["owner", "manager", "sales_staff", "accountant"],
  // Owner decision 2026-10-26 (M-07): Owner, Manager and Sales Staff mutate orders; Accountant reads only.
  "/orders/new": ["owner", "manager", "sales_staff"],
  "/orders/new/paste-parse": ["owner", "manager", "sales_staff"],
  "/orders/new/repeat": ["owner", "manager", "sales_staff"],
  "/orders/:id/transition": ["owner", "manager", "sales_staff"],
  "/daily-card": ["owner", "manager", "sales_staff", "accountant"],
  "/audit-trail": ["owner", "manager", "accountant"],
  "/business": ["owner"],
  "/settings": ["owner", "manager", "sales_staff", "accountant"],
};

const session = (role: Role) => ({ userId: "u", businessId: "b", role, expiresAt: 1_000_000 });
const concrete = (pattern: string): string => pattern.replace(":id", ORDER_ID);

describe("R1.2 extended (B2) — every U1 + U3 route gated by absence", () => {
  test("every registered route has an entry in the restated reach table", () => {
    const registered: string[] = [...routes.keys()].sort();
    expect(registered).toEqual(Object.keys(REACH).sort());
  });

  test("each role reaches exactly the routes the table allows, and is sent to /lock elsewhere", () => {
    for (const path of routes.keys()) {
      const reach = REACH[path];
      for (const role of ROLES) {
        const o = dispatchPath(concrete(path), session(role), 1, undefined);
        const allowed = reach === PUBLIC || (reach ?? []).includes(role);
        const got = o.kind === "render" ? "render" : `redirect:${o.to}`;
        expect({ path, role, got }).toEqual({
          path,
          role,
          got: allowed ? "render" : "redirect:/lock",
        });
      }
    }
  });

  test("no session, or an expired one, never renders a protected route", () => {
    for (const path of routes.keys()) {
      if (REACH[path] === PUBLIC) continue;
      const anon = dispatchPath(concrete(path), null, 1, undefined);
      const expired = dispatchPath(
        concrete(path),
        { ...session("owner"), expiresAt: 0 },
        1,
        undefined,
      );
      expect({ path, anon: anon.kind === "redirect" && anon.to }).toEqual({
        path,
        anon: "/sign-in",
      });
      expect({ path, expired: expired.kind === "redirect" && expired.to }).toEqual({
        path,
        expired: "/sign-in",
      });
    }
  });

  test("inverse: the Owner still reaches order detail, the audit trail and the daily card", () => {
    for (const raw of [
      `/orders/${ORDER_ID}`,
      "/audit-trail",
      "/daily-card",
      `/orders/${ORDER_ID}/transition`,
    ]) {
      const o = dispatchPath(raw, session("owner"), 1, undefined);
      expect({ raw, kind: o.kind }).toEqual({ raw, kind: "render" });
    }
    const detail = dispatchPath(`/orders/${ORDER_ID}`, session("owner"), 1, undefined);
    expect(detail.kind === "render" && detail.params).toEqual({ id: ORDER_ID });
  });

  test("a malformed or unknown order path never reaches a screen; it lands on /not-found", () => {
    for (const raw of [
      "/orders/not-a-uuid",
      "/orders/ORD-1001",
      "/orders//transition",
      "/orders/x/y/z",
      "/nope",
    ]) {
      const o = dispatchPath(raw, session("owner"), 1, undefined);
      expect({ raw, o: o.kind === "redirect" && o.to }).toEqual({ raw, o: "/not-found" });
    }
    // An exact route wins over the :id pattern.
    const create = dispatchPath("/orders/new", session("owner"), 1, undefined);
    expect(create.kind === "render" && create.path).toBe("/orders/new");
  });
});
