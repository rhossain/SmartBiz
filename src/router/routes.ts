/**
 * src/router/routes.ts — typed routes registry.
 * `Map<RoutePath, Route>` is the single source of truth for
 * "every route has a gate" (R1.2). The absence-asserted test
 * walks this map and asserts every entry has a gate.
 *
 * B2 adds the U3 order routes. Their capabilities come from
 * src/orders/order-capability.ts so the router and the order
 * repository cannot disagree about who may read or mutate an order:
 * reads need `business.view`; every create/edit/transition route needs
 * any one of the order-mutation capabilities (`money.mutate.price` or
 * `money.mutate.full`). No new Capability value is added.
 *
 * U1 mounts its routes on real screens: sign-in, sign-up, lock and the new
 * public `/not-found` (where an unknown hash lands). `/` renders nothing; the
 * app sends it on to the orders list or to sign-in / sign-up. Recovery,
 * invitations, the daily card, the audit trail, business and settings stay
 * stubs until their Units (U2+), but keep their gates, so the absence test
 * still walks them.
 */
import { ORDER_MUTATE_CAPABILITIES, ORDER_READ_CAPABILITY } from "../orders/order-capability.js";
import { renderOrdersScreen } from "../orders/screens/render-orders-route.js";
import {
  renderLock,
  renderNotFound,
  renderSignIn,
  renderSignUp,
} from "./screens/render-auth-route.js";
import type { Route, RoutePath } from "./types.js";

const renderStub = (): unknown => null;
const ordersList = (state: unknown): unknown => renderOrdersScreen("list", state);
const manualOrder = (state: unknown): unknown => renderOrdersScreen("manual", state);
const pasteParse = (state: unknown): unknown => renderOrdersScreen("paste-parse", state);
const repeatFromPast = (state: unknown): unknown => renderOrdersScreen("repeat", state);
const orderDetail = (state: unknown): unknown => renderOrdersScreen("detail", state);

export const routes: ReadonlyMap<RoutePath, Route> = new Map<RoutePath, Route>([
  ["/", { path: "/", requiredCapability: null, render: renderStub }],
  ["/sign-in", { path: "/sign-in", requiredCapability: null, render: renderSignIn }],
  ["/sign-up", { path: "/sign-up", requiredCapability: null, render: renderSignUp }],
  ["/recover", { path: "/recover", requiredCapability: null, render: renderStub }],
  ["/reset", { path: "/reset", requiredCapability: null, render: renderStub }],
  ["/accept", { path: "/accept", requiredCapability: null, render: renderStub }],
  ["/orders", { path: "/orders", requiredCapability: ORDER_READ_CAPABILITY, render: ordersList }],
  [
    "/orders/new",
    { path: "/orders/new", requiredCapability: ORDER_MUTATE_CAPABILITIES, render: manualOrder },
  ],
  [
    "/orders/new/paste-parse",
    {
      path: "/orders/new/paste-parse",
      requiredCapability: ORDER_MUTATE_CAPABILITIES,
      render: pasteParse,
    },
  ],
  [
    "/orders/new/repeat",
    {
      path: "/orders/new/repeat",
      requiredCapability: ORDER_MUTATE_CAPABILITIES,
      render: repeatFromPast,
    },
  ],
  [
    "/orders/:id",
    { path: "/orders/:id", requiredCapability: ORDER_READ_CAPABILITY, render: orderDetail },
  ],
  [
    "/orders/:id/transition",
    {
      path: "/orders/:id/transition",
      requiredCapability: ORDER_MUTATE_CAPABILITIES,
      render: orderDetail,
    },
  ],
  ["/daily-card", { path: "/daily-card", requiredCapability: "business.view", render: renderStub }],
  ["/audit-trail", { path: "/audit-trail", requiredCapability: "audit.view", render: renderStub }],
  ["/business", { path: "/business", requiredCapability: "business.edit", render: renderStub }],
  ["/settings", { path: "/settings", requiredCapability: "settings.edit.own", render: renderStub }],
  ["/lock", { path: "/lock", requiredCapability: null, render: renderLock }],
  ["/not-found", { path: "/not-found", requiredCapability: null, render: renderNotFound }],
]);
