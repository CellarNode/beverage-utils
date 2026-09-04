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
import type { BeverageClassification } from "./types.js";
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
