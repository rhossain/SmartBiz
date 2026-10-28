/**
 * src/auth/business-rule.ts — BusinessRule type (BR2.4, third layer).
 * Pure function of state → Ok | Err. No I/O, no clock.
 */
import type { Result } from "../data/result.js";
import type { BusinessRuleError } from "./business-rule-error.js";

export type BusinessRule<State> = {
  readonly name: string;
  readonly evaluate: (state: State) => Result<true, BusinessRuleError>;
};
