/**
 * src/orders/deferred-input.ts — the shared body of the three deferred
 * input modes (US1.14.D photo, US1.15.D spreadsheet, US1.16.D voice; NFR3.3).
 *
 * The vendor for OCR, spreadsheet ingest and speech-to-text is a
 * Construction decision that has not been made, so these modes are typed
 * placeholders rather than silent gaps. Each call returns
 * `{ ok: false, reason: 'deferred' }` and logs one structured
 * `deferred_input_invoked` line with source, actor, business, time and
 * correlation id, so the Bolt that lands a body can size the demand from
 * real usage. Nothing is written to the database and no audit row is
 * appended, because nothing was mutated.
 */
import { now } from "../data/clock.js";
import { info } from "../observability/log.js";
import { newCorrelationId } from "../observability/correlation.js";
import type { DeferredOrderSource, OrderContext } from "./types.js";

export const DEFERRED_INPUT_EVENT = "deferred_input_invoked";

export interface DeferredInputResult {
  readonly ok: false;
  readonly reason: "deferred";
  readonly source: DeferredOrderSource;
}

export const deferInput = (source: DeferredOrderSource, ctx: OrderContext): DeferredInputResult => {
  info(DEFERRED_INPUT_EVENT, {
    event: DEFERRED_INPUT_EVENT,
    source,
    actor_id: ctx.actorUserId,
    business_id: ctx.businessId,
    occurred_at: now().toISOString(),
    correlation_id: ctx.correlationId ?? newCorrelationId(),
  });
  return { ok: false, reason: "deferred", source };
};
