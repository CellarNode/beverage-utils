/**
 * `getCanonicalClassifications()` — the full canonical beverage category →
 * subtype taxonomy (10 categories, CEL-1604 item 5).
 *
 * `@cellarnode/beverage-utils` deliberately ships no hand-typed static for
 * this — it's normally hydrated at runtime via the framework adapters'
 * TanStack Query options — but `@cellarnode/ui`'s opportunity wizard needs
 * a build-in fallback that can't fetch reference data, and currently
 * hand-copies the taxonomy in
 * `ui/src/opportunities/wizard/classification-options.ts`. This accessor is
 * what that file should read from once it moves to consume this package's
 * release (see the PR description for the follow-up ui change).
 *
 * Backed by `./classifications.generated.ts` (produced by
 * `scripts/generate-classifications.mjs` from the vendored
 * `src/canonical/reference-data.json`) rather than a runtime JSON read —
 * CEL-1604 review fixup, P0-1. The earlier draft read
 * `src/canonical/index.ts`'s live accessor directly, which pulled the
 * 157 KB vendored JSON into any consumer's bundle; this module never
 * imports `./canonical/index.js` or the JSON, so it stays cheap
 * (~4 KB minified) for every caller. `src/canonical/index.ts` remains for
 * `__tests__/canonical-parity.test.ts`, which pins the generated literal
 * below against the same vendored row.
 */
import type { BeverageCategory, BeverageClassification, BeverageSubtype } from "./types.js";
import { CANONICAL_CLASSIFICATIONS } from "./classifications.generated.js";

/**
 * Deep-freezes a classification tree so a consumer mutation can't corrupt
 * the shared singleton — matches this package's freeze-hardening
 * convention for every other `STATIC_*` export
 * (`__tests__/freeze-hardening.test.ts`). Runs once at module load; every
 * call to {@link getCanonicalClassifications} returns the same frozen
 * reference (no per-call allocation).
 */
function deepFreezeClassification(
  classification: BeverageClassification,
): BeverageClassification {
  for (const category of classification.categories) {
    for (const subtype of category.subtypes) {
      Object.freeze(subtype);
    }
    Object.freeze(category.subtypes);
    Object.freeze(category);
  }
  Object.freeze(classification.categories);
  return Object.freeze(classification);
}

const FROZEN_CANONICAL_CLASSIFICATIONS = deepFreezeClassification(
  CANONICAL_CLASSIFICATIONS,
);

/**
 * Returns the full canonical beverage category → subtype taxonomy.
 *
 * The returned object (and every category/subtype within it) is frozen —
 * callers that need a mutable copy must clone it themselves.
 */
export function getCanonicalClassifications(): BeverageClassification {
  return FROZEN_CANONICAL_CLASSIFICATIONS;
}

/**
 * Classification joins the same five-function-per-domain shape the other
 * canonical vocabularies (`access-models.ts`, `procurement-channels.ts`)
 * already have (CEL-1607):
 *
 *   1. format  — already shipped: {@link formatBeverageLabel} /
 *      {@link formatBeverageSubtype} / {@link formatBeverageType} in
 *      `./format.ts`. Not duplicated here.
 *   2. build   — already shipped: {@link buildLabelMap} in `./label-map.ts`.
 *      Not duplicated here.
 *   3. is      — {@link isBeverageCategoryId} / {@link isBeverageSubtypeId} below.
 *   4. normalizeAndCheck — {@link normalizeAndCheckBeverageCategoryId} /
 *      {@link normalizeAndCheckBeverageSubtypeId} below.
 *   5. getEntry — {@link getBeverageCategoryEntry} / {@link getBeverageSubtypeEntry} below.
 *
 * Every function below defaults its `classification` parameter to
 * {@link getCanonicalClassifications}, so callers holding a live
 * `useBeverageClassifications()` result can pass `data` through explicitly
 * while callers happy with the static taxonomy can omit it entirely —
 * mirroring `getAccessModelEntry(id, registry = STATIC_ACCESS_MODEL_REGISTRY)`.
 */

/**
 * Strict type guard for a canonical category id within the given
 * classification tree. Returns true only for an EXACT id match — no trim,
 * no case normalisation — mirroring the strictness contract of
 * `isAccessModel` / `isCurrency` / `isProcurementChannel` (CEL-338
 * reviewer correction): a lying predicate that narrowed `"Wine"` to a
 * category id would let downstream code persist a category the tree does
 * not actually contain.
 *
 * Use `normalizeAndCheckBeverageCategoryId` when you want trim +
 * case-insensitive behaviour.
 */
export function isBeverageCategoryId(
  value: unknown,
  classification: BeverageClassification = getCanonicalClassifications(),
): value is string {
  if (typeof value !== "string") return false;
  return classification.categories.some((category) => category.id === value);
}

/**
 * Strict type guard for a canonical subtype id under a specific category.
 * Subtype ids are reused across categories (`red` under `wine` AND
 * `sparkling_wine` — see {@link buildLabelMap}'s composite-key handling),
 * so this always takes the owning category id: a category-blind
 * `isBeverageSubtypeId(subtypeId)` would silently accept a subtype that
 * only exists under a DIFFERENT category.
 */
export function isBeverageSubtypeId(
  categoryId: unknown,
  subtypeId: unknown,
  classification: BeverageClassification = getCanonicalClassifications(),
): boolean {
  if (typeof categoryId !== "string" || typeof subtypeId !== "string") return false;
  const category = classification.categories.find((c) => c.id === categoryId);
  if (!category) return false;
  return category.subtypes.some((subtype) => subtype.id === subtypeId);
}

/**
 * Trim + lowercase + membership check for a category id. Returns the
 * canonical-cased id on success, `null` otherwise. Use this at API / form
 * boundaries where upstream input may be padded or mixed-case; use
 * `isBeverageCategoryId` when you need a strict predicate over an
 * already-normalised value.
 */
export function normalizeAndCheckBeverageCategoryId(
  value: string,
  classification: BeverageClassification = getCanonicalClassifications(),
): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  const lower = trimmed.toLowerCase();
  const match = classification.categories.find((category) => category.id.toLowerCase() === lower);
  return match ? match.id : null;
}

/**
 * Trim + lowercase + membership check for a subtype id under a specific
 * category. Both the category and the subtype must resolve; a subtype
 * that exists only under a different category returns `null`. Mirrors
 * `normalizeAndCheckBeverageCategoryId`.
 */
export function normalizeAndCheckBeverageSubtypeId(
  categoryId: string,
  subtypeId: string,
  classification: BeverageClassification = getCanonicalClassifications(),
): string | null {
  if (typeof categoryId !== "string" || typeof subtypeId !== "string") return null;
  const categoryLower = categoryId.trim().toLowerCase();
  const category = classification.categories.find((c) => c.id.toLowerCase() === categoryLower);
  if (!category) return null;
  const subtypeLower = subtypeId.trim().toLowerCase();
  const match = category.subtypes.find((subtype) => subtype.id.toLowerCase() === subtypeLower);
  return match ? match.id : null;
}

/**
 * Look up a full category entry by id. Returns `null` when the id is
 * unknown so consumers can fall back to a default (or the CEL-1607 D12
 * orphan-repair banner) without throwing. Case-insensitive fallback lookup
 * mirrors `getAccessModelEntry` / `getProcurementChannelEntry`.
 */
export function getBeverageCategoryEntry(
  id: string | null | undefined,
  classification: BeverageClassification = getCanonicalClassifications(),
): BeverageCategory | null {
  if (id === null || id === undefined) return null;
  if (typeof id !== "string") return null;
  const trimmed = id.trim();
  if (trimmed.length === 0) return null;
  const direct = classification.categories.find((category) => category.id === trimmed);
  if (direct) return direct;
  const lower = trimmed.toLowerCase();
  return classification.categories.find((category) => category.id.toLowerCase() === lower) ?? null;
}

/**
 * Look up a full subtype entry under a specific category. Returns `null`
 * when either id is unknown — including a subtype id that is only valid
 * under a *different* category, which is the orphan shape CEL-1607's
 * repair banner (D12) needs to detect on a retired-category product.
 */
export function getBeverageSubtypeEntry(
  categoryId: string | null | undefined,
  subtypeId: string | null | undefined,
  classification: BeverageClassification = getCanonicalClassifications(),
): BeverageSubtype | null {
  const category = getBeverageCategoryEntry(categoryId, classification);
  if (!category) return null;
  if (subtypeId === null || subtypeId === undefined) return null;
  if (typeof subtypeId !== "string") return null;
  const trimmed = subtypeId.trim();
  if (trimmed.length === 0) return null;
  const direct = category.subtypes.find((subtype) => subtype.id === trimmed);
  if (direct) return direct;
  const lower = trimmed.toLowerCase();
  return category.subtypes.find((subtype) => subtype.id.toLowerCase() === lower) ?? null;
}
