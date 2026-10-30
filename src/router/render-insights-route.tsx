/**
 * src/router/render-insights-route.tsx — the container of `/insights` (customer and product
 * insights). The screen takes props only and may not import the client (BR7.4); this
 * container loads `GET /api/insights` on mount with 30 days and again on every period change
 * (nothing cached), passing the phase to the screen. The route is gated by `business.edit`
 * (Owner), so every other role meets the lock screen before this mounts and sends no request.
 */
import * as React from "react";
import type { InsightsApi } from "../client/insights-api.js";
import type { ApiFailure } from "../client/http.js";
import type { Locale } from "../data/enums.js";
import type { InsightPeriod, InsightsResponse } from "../insights/schemas.js";
import { InsightsScreen } from "../insights/screens/Insights.js";
import type { RequestPhase } from "../pres/ApiState.js";

export interface InsightsRouteState {
  readonly kind: "insights";
  readonly locale: Locale;
  readonly insights: InsightsApi;
}

const isInsightsState = (state: unknown): state is InsightsRouteState =>
  typeof state === "object" && state !== null && (state as { kind?: unknown }).kind === "insights";

const InsightsRoute = ({ state }: { readonly state: InsightsRouteState }): React.ReactElement => {
  const { insights } = state;
  const [days, setDays] = React.useState<InsightPeriod>(30);
  const [phase, setPhase] = React.useState<RequestPhase>("loading");
  const [failure, setFailure] = React.useState<ApiFailure | null>(null);
  const [data, setData] = React.useState<InsightsResponse | null>(null);

  const load = React.useCallback(
    async (period: InsightPeriod): Promise<void> => {
      setPhase("loading");
      setFailure(null);
      const r = await insights.get(period);
      if (!r.ok) {
        setFailure(r);
        setPhase("error");
        return;
      }
      setData(r.value);
      setPhase("ready");
    },
    [insights],
  );

  React.useEffect(() => {
    void load(days);
  }, [load, days]);

  return (
    <InsightsScreen
      locale={state.locale}
      days={days}
      phase={phase}
      failure={failure}
      data={data}
      onPeriod={setDays}
      onRetry={() => void load(days)}
    />
  );
};

export const renderInsightsRoute = (state: unknown): React.ReactElement | null =>
  isInsightsState(state) ? <InsightsRoute state={state} /> : null;
