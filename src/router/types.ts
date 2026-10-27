/**
 * src/router/types.ts — Route type. The hash-router registry
 * holds a `Map<RoutePath, Route>`; the three-layer gate
 * dispatcher reads the route's `requiredCapability` on every
 * navigation (BR2.4, R1.2).
 */
import type { Capability } from "../data/enums.js";
import type { BusinessRule } from "../auth/business-rule.js";

export type RoutePath =
  | "/"
  | "/sign-in"
  | "/sign-up"
  | "/recover"
  | "/reset"
  | "/accept"
  | "/orders"
  | "/orders/new"
  | "/orders/new/paste-parse"
  | "/orders/new/repeat"
  | "/orders/:id"
  | "/orders/:id/transition"
  | "/daily-card"
  | "/audit-trail"
  | "/business"
  | "/settings"
  | "/lock";

/**
 * A resolved navigation: the registry key (a pattern such as
 * `/orders/:id`) plus the values its `:name` segments matched.
 */
export interface RouteMatch {
  readonly path: RoutePath;
  readonly params: Readonly<Record<string, string>>;
}

export interface Route<State = unknown> {
  readonly path: RoutePath;
  /**
   * null = public. A list means "any one of these" (B2: order mutation is
   * open to `money.mutate.price` OR `money.mutate.full`); the dispatcher
   * still runs the single-capability three-layer gate.
   */
  readonly requiredCapability: Capability | ReadonlyArray<Capability> | null;
  readonly render: (state: State) => unknown;
  readonly businessRule?: BusinessRule<State>;
}
