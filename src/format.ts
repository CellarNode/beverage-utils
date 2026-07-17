import type { LabelMap } from "./label-map.js";

export function formatBeverageLabel(
  key: string | null | undefined,
  map?: LabelMap,
): string {
  if (!key) return "";
  if (map && Object.hasOwn(map, key)) return map[key];
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatBeverageType(
  category: string,
  subtype?: string | null,
  map?: LabelMap,
): string {
  const cat = formatBeverageLabel(category, map);
  const sub = formatBeverageSubtype(category, subtype, map);
  return sub ? `${cat} / ${sub}` : cat;
}

/**
 * Formats a beverage subtype ID into its category-aware display label.
 *
 * Subtype IDs like `red` are reused across categories (`red` under `wine` vs
 * `sparkling_wine`), so lookup prefers the composite `${categoryId}:${subtypeId}`
 * key emitted by {@link buildLabelMap}, then the flat subtype key, then a
 * humanized fallback. Nullish/empty `subtypeId` returns `""`.
 *
 * {@link formatBeverageType} reuses this so pair and subtype-only formatting
 * cannot drift.
 */
export function formatBeverageSubtype(
  categoryId: string | null | undefined,
  subtypeId?: string | null,
  map?: LabelMap,
): string {
  if (!subtypeId) return "";
  if (categoryId && map) {
    const compositeKey = `${categoryId}:${subtypeId}`;
    if (Object.hasOwn(map, compositeKey)) return map[compositeKey];
  }
  return formatBeverageLabel(subtypeId, map);
}

/**
 * Canonical lowercase enterprise type IDs that match the
 * `enterprise_types` reference-data rows and the Drizzle
 * `enterpriseType` pgEnum in cellarnode-backend-v2.
 */
const ENTERPRISE_TYPE_LABELS: LabelMap = {
  producer: "Producer",
  importer: "Importer",
  distributor: "Distributor",
};

/**
 * Formats a canonical enterprise type ID into its display label.
 *
 * The canonical IDs are lowercase (`producer | importer | distributor`)
 * per the `enterprise_types` reference-data row. Use this helper
 * everywhere a dashboard or email needs to render an enterprise type
 * — never inline TitleCase string literals.
 *
 * Mirrors the {@link formatBeverageLabel} contract:
 * - `null` / `undefined` / `""` → `""`
 * - unrecognised IDs are echoed back unchanged so consumers can detect
 *   non-canonical values at the call site and decide their own fallback.
 *
 * @param id - canonical lowercase enterprise type ID
 * @returns the display label, the empty string for nullish input, or
 *   the original `id` echoed back for unrecognised IDs.
 */
export function formatEnterpriseTypeLabel(
  id: string | null | undefined,
): string {
  if (!id) return "";
  return Object.hasOwn(ENTERPRISE_TYPE_LABELS, id)
    ? ENTERPRISE_TYPE_LABELS[id]
    : id;
}

/**
 * Returns the full map of canonical enterprise type IDs to display
 * labels. Useful for building `<Select>` options or seed fixtures.
 *
 * Returns a fresh object on each call so consumers cannot mutate the
 * shared constant.
 */
export function buildEnterpriseTypeLabelMap(): LabelMap {
  return { ...ENTERPRISE_TYPE_LABELS };
}
