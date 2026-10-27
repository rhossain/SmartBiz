/**
 * src/pres/RequestState.tsx — U1's name for the request-state component (BR8.3; units review
 * R-03; U2 BR5.5).
 *
 * Since U2 there is one component: `RequestState` IS `ApiState` (src/pres/ApiState.tsx)
 * under its old name, with U1's props unchanged, so U1's order screens keep working and gain
 * every U2 view (lock, not-found, conflict, 503, unreachable) without a change of their own.
 */
import { ApiState } from "./ApiState.js";

export const RequestState = ApiState;

export {
  ErrorBanner,
  LOADING_DELAY_MS,
  type ErrorBannerProps,
  type RequestPhase,
  type RequestStateProps,
} from "./ApiState.js";
