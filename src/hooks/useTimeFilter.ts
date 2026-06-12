import { useCallback, useMemo, useState } from "react";
import type { PresetPeriod, TimeFilter } from "@/types/reports.types";
import { resolvePresetDates } from "@/utils/reportDateUtils";

function buildFilter(preset: PresetPeriod, customRange?: { from: Date; to: Date }): TimeFilter {
  const resolved =
    preset === "custom" && customRange
      ? customRange
      : resolvePresetDates(preset);
  return {
    preset,
    customRange,
    resolvedFrom: resolved.from,
    resolvedTo: resolved.to,
  };
}

export function useTimeFilter(initial: PresetPeriod = "last_month") {
  const [filter, setFilter] = useState<TimeFilter>(() => buildFilter(initial));

  const setPreset = useCallback((preset: PresetPeriod) => {
    setFilter(buildFilter(preset));
  }, []);

  const setCustomRange = useCallback((from: Date, to: Date) => {
    setFilter(buildFilter("custom", { from, to }));
  }, []);

  return useMemo(() => ({ filter, setFilter, setPreset, setCustomRange }), [filter, setPreset, setCustomRange]);
}
