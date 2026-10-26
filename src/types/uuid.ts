/**
 * uuid() — RFC 4122 v4 generator using node:crypto (no extra dep).
 * Deterministic and collision-free enough for production use;
 * tests should NOT depend on the specific value, only on its
 * format (the prototype's tests).
 */
import { randomUUID } from "node:crypto";

export type Uuid = string & { readonly __brand: "Uuid" };

export const uuid = (): Uuid => randomUUID() as Uuid;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const isUuid = (s: string): s is Uuid => UUID_RE.test(s);