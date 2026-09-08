/**
 * Canonical certification labels shared by every dashboard (CEL-1702).
 *
 * The producer and importer dashboards used to render the Organic / Fairtrade /
 * Sustainable chips through two unrelated i18n key paths with identical
 * English. Consumers now resolve one stable key per certification through
 * this helper and add that key (with the English fallback) to their own
 * locale file.
 *
 * Guarantee: key-path parity and one English source string. The seven
 * non-English translations still live in each consumer's locale JSON and are
 * produced by that repo's polyglot-i18n run, so they can still differ between
 * surfaces until a shared namespace ships in `@cellarnode/i18n`.
 *
 * Naming follows the sibling vocabularies (`isCurrency`, `isPackaging`,
 * `isClosure`): the guard is `isCertification`, the type `CertificationType`.
 */

export const CERTIFICATION_TYPES = Object.freeze([
  "organic",
  "fairtrade",
  "sustainable",
] as const);

export type CertificationType = (typeof CERTIFICATION_TYPES)[number];

export interface CertificationLabelKey {
  /** Stable i18n key, identical across dashboards: `certification.<id>`. */
  key: string;
  /** English fallback for `t(key, fallback)`. */
  fallback: string;
}

const CERTIFICATION_FALLBACKS: Readonly<Record<CertificationType, string>> = Object.freeze({
  organic: "Organic",
  fairtrade: "Fairtrade",
  sustainable: "Sustainable",
});

/**
 * Strict predicate over an already-normalised value: true only for the three
 * canonical ids. `Object.hasOwn` keeps prototype names (`constructor`,
 * `toString`, `__proto__`) out of the lookup. Use
 * `normalizeAndCheckCertification` at input boundaries.
 */
export function isCertification(value: unknown): value is CertificationType {
  return typeof value === "string" && Object.hasOwn(CERTIFICATION_FALLBACKS, value);
}

/**
 * Trims and lower-cases `value`, then returns the canonical id or `null`.
 * Mirrors `normalizeAndCheckPackaging`: use at boundaries where upstream input
 * may be padded (`" Organic "`) or cased (`"FAIRTRADE"`).
 */
export function normalizeAndCheckCertification(value: unknown): CertificationType | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return isCertification(normalized) ? normalized : null;
}

/**
 * Turns an arbitrary id into a single i18n key segment. i18next treats `.` as
 * `keySeparator` and `:` as `nsSeparator`, so an id like `eu.organic` would
 * otherwise nest and `ns:organic` would be read as a namespace.
 */
function keySegment(id: string): string {
  return id.replace(/[.:]/g, "-");
}

/**
 * Resolves the shared i18n key and English fallback for a certification chip.
 * Canonical ids are matched case- and whitespace-insensitively and always
 * yield `certification.<canonical id>`. Unknown ids still get a stable key
 * (`certification.<id>` with `.` and `:` replaced by `-`) and the trimmed raw
 * id as fallback, so a new certification renders readably before its copy
 * exists.
 */
export function certificationLabelKey(type: string): CertificationLabelKey {
  const canonical = normalizeAndCheckCertification(type);
  if (canonical !== null) {
    return { key: `certification.${canonical}`, fallback: CERTIFICATION_FALLBACKS[canonical] };
  }
  const raw = type.trim();
  return { key: `certification.${keySegment(raw)}`, fallback: raw };
}
