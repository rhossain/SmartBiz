/**
 * src/data/assert-never.ts — the exhaustiveness guard for every `switch` over a union.
 *
 * Moved into the shared kernel (from src/orders/types.ts) so presentation code such as the
 * status labels can switch exhaustively without importing the orders feature (BR7.4). The
 * compiler proves the default branch unreachable; reaching it at runtime means a value from
 * outside the union got past the type system (an untrusted row, say), so it fails loudly.
 */
export const assertNever = (value: never, what: string): never => {
  throw new Error(`Unhandled ${what}: ${String(value)}`);
};
