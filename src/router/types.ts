/**
 * src/router/types.ts — Route type. The hash-router registry
 * holds a `Map<RoutePath, Route>`; the three-layer gate
 * dispatcher reads the route's `requiredCapability` on every
 * navigation (BR2.4, R1.2).
 */
import type { Capability } from "../auth/types.js";
import type { BusinessRule } from "../auth/business-rule.js";

export type RoutePath =
  | "/"
  | "/sign-in"
  | "/sign-up"
  | "/recover"
  | "/reset"
  | "/accept"
  | "/orders"
  | "/daily-card"
  | "/audit-trail"
  | "/business"
  | "/settings"
  | "/lock";

export interface Route<State = unknown> {
  readonly path: RoutePath;
  readonly requiredCapability: Capability | null;
  readonly render: (state: State) => unknown;
  readonly businessRule?: BusinessRule<State>;
}
