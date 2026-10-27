/**
 * src/orders/deferred/voice-order.ts — voice dictation (US1.16.D, deferred).
 *
 * Typed now so `source: 'voice'` is wired end to end (FR5.5). Whether
 * speech-to-text is the browser's Web Speech API or a free-tier cloud
 * service is still open; until it is chosen the call is a logged no-op
 * (see deferred-input.ts).
 */
import { deferInput, type DeferredInputResult } from "../deferred-input.js";
import type { OrderContext } from "../types.js";

export interface VoiceOrderInput {
  readonly audio: Uint8Array;
  readonly mimeType: string;
}

export const voiceOrder = async (
  ctx: OrderContext,
  _input: VoiceOrderInput,
): Promise<DeferredInputResult> => deferInput("voice", ctx);
