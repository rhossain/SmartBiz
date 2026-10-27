/**
 * src/observability/correlation.ts — correlation id generator.
 * 16-hex-char string; counter-resettable in tests.
 */
import { randomBytes } from "node:crypto";

let counter = 0;

export const newCorrelationId = (): string => {
  counter += 1;
  const buf = randomBytes(8).toString("hex");
  return `${buf}-${counter.toString(16).padStart(4, "0")}`;
};

export const resetCorrelationCounter = (): void => {
  counter = 0;
};
