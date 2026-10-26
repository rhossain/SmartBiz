/**
 * src/router/routes.ts — typed routes registry.
 * `Map<RoutePath, Route>` is the single source of truth for
 * "every U1 route has a gate" (R1.2). The absence-asserted test
 * walks this map and asserts every entry has a gate.
 */
import type { Route, RoutePath } from "./types.js";

const renderStub = (): unknown => null;

export const routes: ReadonlyMap<RoutePath, Route> = new Map<RoutePath, Route>([
  ["/", { path: "/", requiredCapability: null, render: renderStub }],
  ["/sign-in", { path: "/sign-in", requiredCapability: null, render: renderStub }],
  ["/sign-up", { path: "/sign-up", requiredCapability: null, render: renderStub }],
  ["/recover", { path: "/recover", requiredCapability: null, render: renderStub }],
  ["/reset", { path: "/reset", requiredCapability: null, render: renderStub }],
  ["/accept", { path: "/accept", requiredCapability: null, render: renderStub }],
  ["/orders", { path: "/orders", requiredCapability: "business.view", render: renderStub }],
  ["/daily-card", { path: "/daily-card", requiredCapability: "business.view", render: renderStub }],
  ["/audit-trail", { path: "/audit-trail", requiredCapability: "audit.view", render: renderStub }],
  ["/business", { path: "/business", requiredCapability: "business.edit", render: renderStub }],
  ["/settings", { path: "/settings", requiredCapability: "settings.edit.own", render: renderStub }],
  ["/lock", { path: "/lock", requiredCapability: null, render: renderStub }],
]);
