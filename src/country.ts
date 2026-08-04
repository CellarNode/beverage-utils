/**
 * ISO-3166-1 country-of-origin vocabulary generated from i18n-iso-countries.
 * This is world reference data, not CellarNode's mutable operating-markets policy.
 */
import {
  COUNTRY_CODES,
  type CountryCode,
  STATIC_COUNTRY_LABEL_MAP as GENERATED_COUNTRY_LABEL_MAP,
} from "./country-codes.generated.js";
import {
  isCountryCode,
  normalizeCountryToRegistryCode,
} from "./country-normalizer.js";

export type { CountryCode };
export { COUNTRY_CODES, isCountryCode };

const CURATED_COUNTRY_LABEL_OVERRIDES: Readonly<
  Partial<Record<CountryCode, string>>
> = Object.freeze({
  FR: "France",
  IT: "Italy",
  ES: "Spain",
  PT: "Portugal",
  DE: "Germany",
  AT: "Austria",
  GR: "Greece",
  HU: "Hungary",
  GB: "United Kingdom",
  CH: "Switzerland",
  BE: "Belgium",
  NL: "Netherlands",
  DK: "Denmark",
  SE: "Sweden",
  NO: "Norway",
  FI: "Finland",
  PL: "Poland",
  CZ: "Czechia",
  HR: "Croatia",
  SI: "Slovenia",
  GE: "Georgia",
  TR: "Turkey",
  LB: "Lebanon",
  ZA: "South Africa",
  US: "United States",
  CA: "Canada",
  MX: "Mexico",
  AR: "Argentina",
  CL: "Chile",
  UY: "Uruguay",
  BR: "Brazil",
  AU: "Australia",
  NZ: "New Zealand",
  JP: "Japan",
  CN: "China",
  KR: "South Korea",
  IN: "India",
  TH: "Thailand",
  SG: "Singapore",
  AE: "United Arab Emirates",
});

export const STATIC_COUNTRY_LABEL_MAP: Readonly<Record<string, string>> =
  Object.freeze({
    ...GENERATED_COUNTRY_LABEL_MAP,
    ...CURATED_COUNTRY_LABEL_OVERRIDES,
  });

export interface CountryRegistryEntry {
  readonly code: CountryCode;
  readonly name: string;
}

export const STATIC_COUNTRY_FALLBACK: ReadonlyArray<CountryRegistryEntry> =
  Object.freeze(
    COUNTRY_CODES.map((code) =>
      Object.freeze({ code, name: STATIC_COUNTRY_LABEL_MAP[code] }),
    ),
  );

/**
 * Format a country code for display while preserving orphaned stored values.
 * Unknown strings are echoed so consumers can show the raw value in warnings.
 */
export function formatCountryLabel(
  code: CountryCode | string | null | undefined,
  labelMap: Readonly<Record<string, string>> = STATIC_COUNTRY_LABEL_MAP,
): string {
  if (code === null || code === undefined) return "";
  if (typeof code !== "string") return "";
  const trimmed = code.trim();
  if (trimmed.length === 0) return "";
  const upper = trimmed.toUpperCase();
  return labelMap[upper] ?? trimmed;
}

/** Build a full static code-to-name map with valid live entries overlaid. */
export function buildCountryLabelMap(
  entries: readonly unknown[] | null | undefined,
): Readonly<Record<string, string>> {
  if (!entries || entries.length === 0) return STATIC_COUNTRY_LABEL_MAP;

  const out: Record<string, string> = { ...STATIC_COUNTRY_LABEL_MAP };
  let hasLiveEntry = false;
  for (const entry of entries) {
    if (
      typeof entry !== "object" ||
      entry === null ||
      !("code" in entry) ||
      !("name" in entry) ||
      typeof entry.code !== "string" ||
      typeof entry.name !== "string"
    ) {
      continue;
    }
    const upper = entry.code.trim().toUpperCase();
    if (upper.length === 0) continue;
    const name = entry.name.trim();
    out[upper] = name || upper;
    hasLiveEntry = true;
  }

  return hasLiveEntry ? Object.freeze(out) : STATIC_COUNTRY_LABEL_MAP;
}

/** @deprecated Use normalizeCountryToRegistryCode instead. */
export function normalizeAndCheckCountryCode(
  value: string,
): CountryCode | null {
  return normalizeCountryToRegistryCode(value);
}
