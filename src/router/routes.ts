/**
 * src/router/routes.ts — typed routes registry.
 * `Map<RoutePath, Route>` is the single source of truth for
 * "every route has a gate" (R1.2). The absence-asserted test
 * walks this map and asserts every entry has a gate.
 *
 * B2 adds the U3 order routes. Their capabilities come from
 * src/orders/order-capability.ts so the router and the order
 * repository cannot disagree about who may read or mutate an order:
 * reads need `business.view`, every create/edit/transition route needs
 * the order-mutation capability. No new Capability value is added.
 */
import { ORDER_MUTATE_CAPABILITY, ORDER_READ_CAPABILITY } from "../orders/order-capability.js";
import type { Route, RoutePath } from "./types.js";

const renderStub = (): unknown => null;

export const routes: ReadonlyMap<RoutePath, Route> = new Map<RoutePath, Route>([
  ["/", { path: "/", requiredCapability: null, render: renderStub }],
  ["/sign-in", { path: "/sign-in", requiredCapability: null, render: renderStub }],
  ["/sign-up", { path: "/sign-up", requiredCapability: null, render: renderStub }],
  ["/recover", { path: "/recover", requiredCapability: null, render: renderStub }],
  ["/reset", { path: "/reset", requiredCapability: null, render: renderStub }],
  ["/accept", { path: "/accept", requiredCapability: null, render: renderStub }],
  ["/orders", { path: "/orders", requiredCapability: ORDER_READ_CAPABILITY, render: renderStub }],
  ["/orders/new", { path: "/orders/new", requiredCapability: ORDER_MUTATE_CAPABILITY, render: renderStub }],
  [
    "/orders/new/paste-parse",
    { path: "/orders/new/paste-parse", requiredCapability: ORDER_MUTATE_CAPABILITY, render: renderStub },
  ],
  ["/orders/new/repeat", { path: "/orders/new/repeat", requiredCapability: ORDER_MUTATE_CAPABILITY, render: renderStub }],
  ["/orders/:id", { path: "/orders/:id", requiredCapability: ORDER_READ_CAPABILITY, render: renderStub }],
  [
    "/orders/:id/transition",
    { path: "/orders/:id/transition", requiredCapability: ORDER_MUTATE_CAPABILITY, render: renderStub },
  ],
  ["/daily-card", { path: "/daily-card", requiredCapability: "business.view", render: renderStub }],
  ["/audit-trail", { path: "/audit-trail", requiredCapability: "audit.view", render: renderStub }],
  ["/business", { path: "/business", requiredCapability: "business.edit", render: renderStub }],
  ["/settings", { path: "/settings", requiredCapability: "settings.edit.own", render: renderStub }],
  ["/lock", { path: "/lock", requiredCapability: null, render: renderStub }],
]);
