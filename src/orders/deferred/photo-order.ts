/**
 * src/orders/deferred/photo-order.ts — photo capture (US1.14.D, deferred).
 *
 * The typed entry point exists so screens and FR5.5's `source: 'photo'`
 * can be wired now. The OCR body lands when its vendor is chosen; until
 * then the call is a logged no-op (see deferred-input.ts). It is async
 * because the real body will call an OCR service.
 */
import { deferInput, type DeferredInputResult } from "../deferred-input.js";
import type { OrderContext } from "../types.js";

export interface PhotoOrderInput {
  readonly image: Uint8Array;
  readonly mimeType: string;
}

export const photoOrder = async (
  ctx: OrderContext,
  _input: PhotoOrderInput,
): Promise<DeferredInputResult> => deferInput("photo", ctx);
