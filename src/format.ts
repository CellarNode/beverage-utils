import type { LabelMap } from "./label-map.js";

export function formatBeverageLabel(
  key: string | null | undefined,
  map?: LabelMap,
): string {
  if (!key) return "";
  if (map?.[key]) return map[key];
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatBeverageType(
  category: string,
  subtype?: string | null,
  map?: LabelMap,
): string {
  const cat = formatBeverageLabel(category, map);
  if (!subtype) return cat;
  const compositeKey = `${category}:${subtype}`;
  const sub = map?.[compositeKey]
    ? map[compositeKey]
    : formatBeverageLabel(subtype, map);
  return `${cat} / ${sub}`;
}
