import type { BeverageCategory, BeverageClassification, BeverageSubtype } from "../types.js";
import { getCanonicalClassifications } from "../classifications.js";
import type { ReferenceDataRow, UseReferenceDataOptions, UseReferenceDataResult } from "./use-reference-data.js";
import { useReferenceData } from "./use-reference-data.js";

/**
 * Structural check that a parsed `subtypes` entry is shaped like
 * `BeverageSubtype` — non-empty string `id` and `name`. `oivType` is
 * optional per the type, so left unchecked.
 */
function looksLikeSubtype(value: unknown): value is BeverageSubtype {
  if (value === null || typeof value !== "object") return false;
  const candidate = value as { id?: unknown; name?: unknown };
  return (
    typeof candidate.id === "string" &&
    candidate.id.length > 0 &&
    typeof candidate.name === "string" &&
    candidate.name.length > 0
  );
}

/**
 * Structural check that a parsed `categories` array is shaped like
 * `BeverageCategory[]`: every entry needs a non-empty string `id`, a
 * non-empty string `name`, and a `subtypes` array whose entries each pass
 * `looksLikeSubtype`. `hsHeading` is optional per the type, so left
 * unchecked — CEL-1607 review fixup: a category with only an `id` used to
 * pass this check and then throw downstream in `buildLabelMap`,
 * `getBeverageSubtypeEntry`, and `isBeverageSubtypeId`, all of which
 * dereference `name` / iterate `subtypes` unconditionally.
 */
function looksLikeCategories(value: unknown): value is BeverageCategory[] {
  if (!Array.isArray(value)) return false;
  return value.every((entry) => {
    if (entry === null || typeof entry !== "object") return false;
    const candidate = entry as { id?: unknown; name?: unknown; subtypes?: unknown };
    if (typeof candidate.id !== "string" || candidate.id.length === 0) return false;
    if (typeof candidate.name !== "string" || candidate.name.length === 0) return false;
    if (!Array.isArray(candidate.subtypes)) return false;
    return candidate.subtypes.every(looksLikeSubtype);
  });
}

/**
 * Parses the `{ jsonData: { categories: [...] }, version }` envelope every
 * one of the three replaced fetchers already assumed — admin's
 * `GET /admin/reference-data/beverage_classifications`, the public
 * `GET /api/v1/classifications/beverage-types`, and this React adapter's own
 * `beverageLabelMapOptions` (removed in CEL-1660; the Vue and Angular
 * adapters still ship their own copy of that hook independently). Returns
 * `null` on any unrecognised shape so the hook falls back to the shipped
 * statics.
 */
export function parseBeverageClassificationEnvelope(json: unknown): BeverageClassification | null {
  if (json === null || typeof json !== "object") return null;
  const jsonData = (json as { jsonData?: unknown }).jsonData;
  if (jsonData === null || typeof jsonData !== "object") return null;
  const categories = (jsonData as { categories?: unknown }).categories;
  if (!looksLikeCategories(categories)) return null;
  return { categories };
}

/**
 * The canonical `beverage_classifications` row (CEL-1607). Admin reaches
 * it through the generic reference-data route; the public/cross-origin
 * surface has no generic equivalent for this specific row and instead
 * exposes it through the unauthenticated open-api-v1 taxonomy endpoint —
 * same envelope shape, different path, which is exactly the divergence
 * `useReferenceData`'s `paths` field exists to hide from callers.
 *
 * `fallback` is `getCanonicalClassifications()` — a generated TypeScript
 * literal (`../classifications.generated.ts`), NOT the vendored
 * `../canonical/reference-data.json`. Importing this module therefore
 * never reaches the 157 KB vendored JSON (CEL-1604 review fixup, P0-1) —
 * see the PR body's bundle-size proof.
 */
export const CLASSIFICATION_REFERENCE_ROW: ReferenceDataRow<BeverageClassification> = {
  dataId: "beverage_classifications",
  paths: {
    admin: "/admin/reference-data/beverage_classifications",
    public: "/api/v1/classifications/beverage-types",
  },
  parse: parseBeverageClassificationEnvelope,
  fallback: getCanonicalClassifications(),
};

/**
 * Convenience wrapper binding `useReferenceData` to the classification
 * row. Equivalent to `useReferenceData(CLASSIFICATION_REFERENCE_ROW, options)`.
 *
 * ```ts
 * // same-origin admin caller
 * const { data, isLoading } = useBeverageClassifications({
 *   transport: { kind: "admin", requestInit: { credentials: "include" } },
 * });
 *
 * // cross-origin public caller
 * const { data, isLoading } = useBeverageClassifications({
 *   transport: { kind: "public", baseUrl: "http://localhost:4000" },
 * });
 * ```
 */
export function useBeverageClassifications(
  options: UseReferenceDataOptions,
): UseReferenceDataResult<BeverageClassification> {
  return useReferenceData(CLASSIFICATION_REFERENCE_ROW, options);
}
