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

/**
 * Canonical lowercase enterprise type IDs that match the
 * `enterprise_types` reference-data rows and the Drizzle
 * `enterpriseType` pgEnum in cellarnode-backend-v2.
 */
const ENTERPRISE_TYPE_LABELS: Record<string, string> = {
  producer: "Producer",
  importer: "Importer",
  distributor: "Distributor",
};

const UNKNOWN_ENTERPRISE_TYPE_LABEL = "Unknown enterprise type";

/**
 * Formats a canonical enterprise type ID into its display label.
 *
 * The canonical IDs are lowercase (`producer | importer | distributor`)
 * per the `enterprise_types` reference-data row. Use this helper
 * everywhere a dashboard or email needs to render an enterprise type
 * — never inline TitleCase string literals.
 *
 * @param id - canonical lowercase enterprise type ID
 * @returns the display label, or `"Unknown enterprise type"` for
 *   null / undefined / unrecognised IDs
 */
export function formatEnterpriseTypeLabel(
  id: string | null | undefined,
): string {
  if (!id) return UNKNOWN_ENTERPRISE_TYPE_LABEL;
  return ENTERPRISE_TYPE_LABELS[id] ?? UNKNOWN_ENTERPRISE_TYPE_LABEL;
}

/**
 * Returns the full map of canonical enterprise type IDs to display
 * labels. Useful for building `<Select>` options or seed fixtures.
 *
 * Returns a fresh object on each call so consumers cannot mutate the
 * shared constant.
 */
export function buildEnterpriseTypeLabelMap(): Record<string, string> {
  return { ...ENTERPRISE_TYPE_LABELS };
}
