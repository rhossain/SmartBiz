/**
 * src/data/uuid.ts — branded UUIDs (moved from src/types/ by domain-design follow-up R-04).
 *
 * `uuid()` uses Web Crypto's `crypto.randomUUID`, which exists in every current browser and
 * in bun, so the shared kernel never pulls `node:crypto` into the browser bundle (BR7.3,
 * AC1.7a.3). Tests depend on the format of an id, never on its value.
 */
export type Uuid = string & { readonly __brand: "Uuid" };

export const uuid = (): Uuid => globalThis.crypto.randomUUID() as Uuid;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const isUuid = (s: string): s is Uuid => UUID_RE.test(s);
