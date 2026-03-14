import type { BeverageClassification } from "./types.js";

export type LabelMap = Record<string, string>;

export function buildLabelMap(classification: BeverageClassification): LabelMap {
  const map: LabelMap = {};
  for (const cat of classification.categories) {
    map[cat.id] = cat.name;
    for (const sub of cat.subtypes) {
      map[sub.id] = sub.name;
      map[`${cat.id}:${sub.id}`] = sub.name;
    }
  }
  return map;
}
