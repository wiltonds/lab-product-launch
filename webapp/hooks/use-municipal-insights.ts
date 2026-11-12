import { useEffect, useState } from "react";
import { fetchMunicipalInsights, type InsightsState } from "@/shared/insights";

export function useMunicipalInsights(municipalityCode: string, activityId: string): InsightsState {
  const [state, setState] = useState<InsightsState>({ status: "loading" });
  useEffect(() => {
    const ctrl = new AbortController();
    setState({ status: "loading" });
    void fetchMunicipalInsights(municipalityCode, activityId, ctrl.signal).then((s) => { if (!ctrl.signal.aborted) setState(s); });
    return () => ctrl.abort();
  }, [municipalityCode, activityId]);
  return state;
}
