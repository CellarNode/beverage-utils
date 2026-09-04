import type { BeverageCategory, BeverageClassification } from "../types.js";
import { getCanonicalClassifications } from "../classifications.js";
import type { ReferenceDataRow, UseReferenceDataOptions, UseReferenceDataResult } from "./use-reference-data.js";
import { useReferenceData } from "./use-reference-data.js";

/**
 * Best-effort structural check that a parsed `categories` array is at
 * least shaped like `BeverageCategory[]` (each entry an object with a
 * non-empty string `id`). Mirrors the duck-typing the three fetchers this
 * hook replaces already did — the payload doesn't carry a runtime schema,
 * so this is deliberately permissive on `subtypes` / `hsHeading` shape and
 * strict only on the field every caller keys off of (`id`).
 */
function looksLikeCategories(value: unknown): value is BeverageCategory[] {
  if (!Array.isArray(value)) return false;
  return value.every(
    (entry) =>
      entry !== null &&
      typeof entry === "object" &&
      typeof (entry as { id?: unknown }).id === "string" &&
      (entry as { id: string }).id.length > 0,
  );
}

/**
 * Parses the `{ jsonData: { categories: [...] }, version }` envelope every
 * one of the three replaced fetchers already assumed — admin's
 * `GET /admin/reference-data/beverage_classifications`, the public
 * `GET /api/v1/classifications/beverage-types`, and this package's own
 * `beverageLabelMapOptions`. Returns `null` on any unrecognised shape so
 * the hook falls back to the shipped statics.
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
