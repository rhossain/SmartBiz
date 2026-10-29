/**
 * src/data/keyset-cursor.ts — the C1 paging cursor, shared by every keyset list (C1 paging;
 * U1 BR6.6; U4 BR5.1, BR6.8, SC7).
 *
 * A cursor is base64url of `<ISO time>|<uuid>` of the last row of a page ordered by
 * (created_at DESC, id DESC). It is opaque to callers: anything that does not decode to
 * exactly that is refused (`null`) instead of being passed to SQL, so following cursors never
 * repeats or skips a row. Moved here from src/orders/list-orders.ts (which re-exports it) so
 * the catalog lists use the same cursor without importing the orders unit (U4 W11, no
 * cycle). Pure and browser-safe.
 */
import { isUuid, type Uuid } from "./uuid.js";

export interface Cursor {
  readonly createdAt: string;
  readonly id: Uuid;
}

const toBase64Url = (text: string): string =>
  btoa(text).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const fromBase64Url = (raw: string): string | null => {
  if (!/^[A-Za-z0-9_-]+$/.test(raw)) return null;
  const b64 = raw.replace(/-/g, "+").replace(/_/g, "/");
  try {
    return atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  } catch {
    return null;
  }
};

export const encodeCursor = (createdAt: string, id: string): string =>
  toBase64Url(`${createdAt}|${id}`);

export const decodeCursor = (raw: string): Cursor | null => {
  const text = fromBase64Url(raw);
  if (text === null) return null;
  const [createdAt, id, extra] = text.split("|");
  if (extra !== undefined || createdAt === undefined || id === undefined) return null;
  if (!isUuid(id) || !/^\d{4}-\d{2}-\d{2}T/.test(createdAt) || Number.isNaN(Date.parse(createdAt)))
    return null;
  return { createdAt: new Date(createdAt).toISOString(), id };
};
