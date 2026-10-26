/**
 * src/orders/index.ts — the U3-orders typed function-call surface.
 *
 * One registry per concern (team.md §CS-6): other units import the
 * orders surface from this file only, never from the individual
 * modules, so the module layout inside `src/orders/` can change
 * without breaking U4 (the settlement callback, Contract #6) or the
 * router. Each layer of the B2 Bolt adds its exports here as it lands.
 */
export * from "./types.js";
