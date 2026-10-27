/**
 * src/orders/deferred/spreadsheet-order.ts — spreadsheet upload (US1.15.D, deferred).
 *
 * Typed now so `source: 'spreadsheet'` is wired end to end (FR5.5). The
 * .xlsx/.csv ingest with per-row Bangla errors lands with its vendor
 * decision; until then the call is a logged no-op (see deferred-input.ts).
 */
import { deferInput, type DeferredInputResult } from "../deferred-input.js";
import type { OrderContext } from "../types.js";

export interface SpreadsheetOrderInput {
  readonly file: Uint8Array;
  readonly fileName: string;
}

export const spreadsheetOrder = async (
  ctx: OrderContext,
  _input: SpreadsheetOrderInput,
): Promise<DeferredInputResult> => deferInput("spreadsheet", ctx);
