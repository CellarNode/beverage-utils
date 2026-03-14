import { useQuery, queryOptions } from "@tanstack/vue-query";
import { buildLabelMap } from "../label-map.js";
import type { LabelMap } from "../label-map.js";
import type { BeverageClassification } from "../types.js";

export function beverageLabelMapOptions(apiBaseUrl: string) {
  return queryOptions({
    queryKey: ["beverage-classifications"] as const,
    queryFn: async (): Promise<LabelMap> => {
      const res = await fetch(
        `${apiBaseUrl}/api/v1/classifications/beverage-types`,
      );
      if (!res.ok) throw new Error("Failed to fetch beverage classifications");
      const data = await res.json();
      return buildLabelMap(data.jsonData as BeverageClassification);
    },
    staleTime: Infinity,
  });
}

export function useBeverageLabelMap(apiBaseUrl: string) {
  return useQuery(beverageLabelMapOptions(apiBaseUrl));
}
