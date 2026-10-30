/**
 * src/server/limits.ts — request body limits, in one module both the pipeline and the route
 * handlers import (so no import cycle can leave one undefined at start-up).
 *
 *   MAX_BODY_BYTES    every route's body limit (64 KiB; S7).
 *   MAX_UPLOAD_BYTES  the largest a route may declare with `maxBodyBytes` (1 MiB; the product
 *                     photo upload) and Bun's own `maxRequestBodySize`.
 */
export const MAX_BODY_BYTES = 65_536;
export const MAX_UPLOAD_BYTES = 1_048_576;
