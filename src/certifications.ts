/**
 * Canonical certification labels shared by every dashboard (CEL-1702).
 *
 * The producer and importer dashboards used to render the Organic / Fairtrade /
 * Sustainable chips through two unrelated i18n key paths with identical
 * English, so the machine-translated locales could drift between surfaces.
 * Consumers now resolve one stable key per certification through this helper
 * and add that key (with the English fallback) to their own locale file.
 */

export const CERTIFICATION_TYPES = ["organic", "fairtrade", "sustainable"] as const;

export type CertificationType = (typeof CERTIFICATION_TYPES)[number];

export interface CertificationLabelKey {
  /** Stable i18n key, identical across dashboards: `certification.<type>`. */
  key: string;
  /** English fallback for `t(key, fallback)`. */
  fallback: string;
}

const CERTIFICATION_FALLBACKS: Record<CertificationType, string> = {
  organic: "Organic",
  fairtrade: "Fairtrade",
  sustainable: "Sustainable",
};

/** True for the three canonical certification ids. */
export function isCertificationType(type: string): type is CertificationType {
  return Object.hasOwn(CERTIFICATION_FALLBACKS, type);
}

/**
 * Resolves the shared i18n key and English fallback for a certification chip.
 * Unknown ids still get a stable key (`certification.<type>`) and the raw id as
 * fallback, so a new certification renders readably before its copy exists.
 * `Object.hasOwn` keeps prototype names (`constructor`, `toString`) out of the
 * lookup.
 */
export function certificationLabelKey(type: string): CertificationLabelKey {
  const fallback = isCertificationType(type) ? CERTIFICATION_FALLBACKS[type] : type;
  return { key: `certification.${type}`, fallback };
}
