/**
 * `getAromaDescriptorFamilies()` / `getAromaDescriptorFamily()` /
 * `getAromaDescriptorLabel()` — the canonical aroma/sensory descriptor
 * lexicon (CEL-1618), grouped by beverage family (`wine`, `spirits`,
 * `beer`).
 *
 * This is the client-side counterpart to
 * `cellarnode-backend-v2/apps/cellarnode/src/lib/aroma-descriptor-index.ts`
 * (CEL-1614) and its `classificationRegistry.getAromaDescriptorFamily` /
 * `getAromaDescriptorLabel` methods. It deliberately does NOT re-implement
 * the server's fold/alias resolution (`resolveAromaDescriptor`,
 * `foldAromaText`) — this package only needs to (a) list a family's terms
 * as chip suggestions and (b) render the canonical label for an
 * already-resolved slug. Distinguishing an "exact" vs "alias" vs "custom"
 * match only matters when RESOLVING free text server-side (extraction,
 * migration backfill); a client rendering an already-stored value only
 * needs slug -> label, with a lenient fallback to the raw string for any
 * value that isn't a known slug (unmigrated free text, or a producer's
 * genuine custom entry) — same lenient-by-design contract as the backend
 * (spec `docs/specs/2026-09-02-matching-canonical-deepening.md` §2 D11/D26).
 *
 * Backed by `./aroma-descriptors.generated.ts` (produced by
 * `scripts/generate-aroma-descriptors.mjs` from the vendored
 * `src/canonical/reference-data.json`) rather than a runtime JSON read,
 * mirroring `./classifications.ts`'s CEL-1604 review fixup (P0-1): this
 * module never imports `./canonical/index.js` or the JSON, so it stays
 * small for every caller regardless of the lexicon's size.
 */
import type { AromaDescriptorFamilies, AromaDescriptorFamily } from "./types.js";
import { CANONICAL_AROMA_DESCRIPTOR_FAMILIES } from "./aroma-descriptors.generated.js";

/**
 * Deep-freezes the family tree so a consumer mutation can't corrupt the
 * shared singleton — matches this package's freeze-hardening convention
 * for every other canonical export. Runs once at module load.
 */
function deepFreezeAromaDescriptorFamilies(
  families: AromaDescriptorFamilies,
): AromaDescriptorFamilies {
  for (const family of Object.values(families)) {
    for (const term of family.terms) {
      if (term.aliases) Object.freeze(term.aliases);
      Object.freeze(term);
    }
    Object.freeze(family.terms);
    Object.freeze(family);
  }
  return Object.freeze(families);
}

const FROZEN_AROMA_DESCRIPTOR_FAMILIES = deepFreezeAromaDescriptorFamilies(
  CANONICAL_AROMA_DESCRIPTOR_FAMILIES,
);

/**
 * Every canonical aroma-descriptor family, keyed by beverage category id
 * (`wine`, `spirits`, `beer`). Only `wine` is reachable from a live
 * `string[]` sensory field today — `spirits` and `beer`'s aroma fields are
 * still plain `string` on the backend (CEL-1614) — but all three ship so a
 * caller doesn't need a separate release once those fields widen.
 *
 * The returned object (and every family/term within it) is frozen —
 * callers that need a mutable copy must clone it themselves.
 */
export function getAromaDescriptorFamilies(): AromaDescriptorFamilies {
  return FROZEN_AROMA_DESCRIPTOR_FAMILIES;
}

/** One family's vocabulary (label, standard reference, and terms), or `null` when `familyId` has no lexicon. */
export function getAromaDescriptorFamily(familyId: string): AromaDescriptorFamily | null {
  if (!Object.hasOwn(FROZEN_AROMA_DESCRIPTOR_FAMILIES, familyId)) return null;
  return FROZEN_AROMA_DESCRIPTOR_FAMILIES[familyId] ?? null;
}

/**
 * Canonical display label for a stored value. Falls back to `slugOrText`
 * itself when `familyId` has no lexicon or the value isn't a recognised
 * slug — lenient by design, never throws (mirrors the backend's
 * `aromaDescriptorLabel`). Callers can treat "the fallback fired" as
 * "this value is a custom / unmigrated entry" without a separate flag:
 * `getAromaDescriptorLabel(familyId, value) === value` when no canonical
 * term matched.
 */
export function getAromaDescriptorLabel(familyId: string, slugOrText: string): string {
  if (!Object.hasOwn(FROZEN_AROMA_DESCRIPTOR_FAMILIES, familyId)) return slugOrText;
  const family = FROZEN_AROMA_DESCRIPTOR_FAMILIES[familyId];
  if (!family) return slugOrText;
  const term = family.terms.find((t) => t.slug === slugOrText);
  return term?.label ?? slugOrText;
}
