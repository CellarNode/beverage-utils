/**
 * Canonical ISO-3166 alpha-2 country codes (CEL-338 / CEL-336).
 *
 * Mirrors `cellarnode-backend-v2/src/db/canonical/reference-data.ts` rows
 * 252-300 (`dataId: "country_codes"`, `canonicalVersion: 1`). 40 codes are
 * supported across the platform — every consumer dropdown should derive
 * its option list from this registry instead of hand-rolling a fresh list
 * (importer-dashboard's hand-rolled 196-row file will be deleted in the
 * consumer sweep after this lib publish).
 *
 * The `as const` tuple is the source of truth for both the `CountryCode`
 * union AND the runtime list. Add new rows here AND in the backend
 * canonical file in lockstep so the union always matches the backend
 * registry. Per CEL-336 acceptance criteria, every canonical helper
 * exports a typed union AND a formatter.
 */
export const COUNTRY_CODES = [
  // Western & Southern Europe (wine-producing core)
  "FR",
  "IT",
  "ES",
  "PT",
  "DE",
  "AT",
  "GR",
  "HU",
  "GB",
  "CH",
  "BE",
  "NL",
  // Nordics
  "DK",
  "SE",
  "NO",
  "FI",
  // Central & Eastern Europe
  "PL",
  "CZ",
  "HR",
  "SI",
  // Caucasus / Mediterranean rim
  "GE",
  "TR",
  "LB",
  // Africa
  "ZA",
  // Americas
  "US",
  "CA",
  "MX",
  "AR",
  "CL",
  "UY",
  "BR",
  // Oceania
  "AU",
  "NZ",
  // East & South Asia
  "JP",
  "CN",
  "KR",
  "IN",
  "TH",
  "SG",
  // Middle East
  "AE",
] as const;

/**
 * Typed union of every canonical country code. Consumers should prefer
 * `country: CountryCode` over `country: string` to get exhaustiveness
 * checks (e.g. switch statements over partner regions) and to surface
 * stale codes at compile time when the registry shrinks. Per CEL-336.
 */
export type CountryCode = (typeof COUNTRY_CODES)[number];

/**
 * Static fallback label map. The hook hydrates the full canonical list
 * from the backend at runtime, but consumers rendering before the query
 * resolves (SSR, offline, or a brand-new client without a populated
 * React-Query cache) get a usable display label for the most common
 * codes. Keeping this tiny intentionally — the static fallback is a
 * crash-prevention floor, not a replacement for the runtime registry.
 */
export const STATIC_COUNTRY_FALLBACK: ReadonlyArray<{
  code: CountryCode;
  name: string;
}> = Object.freeze([
  Object.freeze({ code: "FR", name: "France" }),
  Object.freeze({ code: "IT", name: "Italy" }),
  Object.freeze({ code: "ES", name: "Spain" }),
  Object.freeze({ code: "DE", name: "Germany" }),
  Object.freeze({ code: "US", name: "United States" }),
]);

/**
 * Lookup-shaped projection of `STATIC_COUNTRY_FALLBACK`. Kept separate
 * from the array form so the array can stay ordered (UI-friendly) and
 * the map can stay O(1) (formatter-friendly).
 */
export const STATIC_COUNTRY_LABEL_MAP: Readonly<Record<string, string>> =
  Object.freeze(
    STATIC_COUNTRY_FALLBACK.reduce<Record<string, string>>((acc, entry) => {
      acc[entry.code] = entry.name;
      return acc;
    }, {}),
  );

/**
 * One canonical country registry entry — `code` is always an ISO-3166
 * alpha-2 code, `name` is the canonical display label from the backend
 * reference-data row. The lib's `useCountryCodes()` hook normalizes raw
 * `jsonData` payloads into this shape so consumers never branch on the
 * inner representation.
 */
export interface CountryRegistryEntry {
  code: CountryCode;
  name: string;
}

/**
 * Format a country code into its canonical display name. Mirrors the
 * contract from `@cellarnode/beverage-utils`'s `formatBeverageLabel` +
 * CEL-337's `formatEnterpriseTypeLabel`:
 *
 * - `null` / `undefined` / empty → returns `""` (caller renders the
 *   empty cell however it wants — em-dash, "—", "None").
 * - Unknown code (not in the supplied / static label map) → echoes the
 *   input back so the user sees the raw code rather than nothing. This
 *   matches how mid-flight registry edits behave elsewhere in the lib.
 * - Known code → returns the canonical display name.
 *
 * The default `labelMap` is the tiny static fallback. Pass the
 * full hydrated map (e.g. `buildCountryLabelMap(query.data)`) for
 * consumers that have already fetched the runtime registry.
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

/**
 * Build a `code → name` map from a runtime registry array. Returned as
 * a plain frozen object so consumers can pass it around as a stable
 * label-source for formatters / table-cell renderers. O(n) build, O(1)
 * lookup. Pure — never throws on malformed rows (they're skipped).
 */
export function buildCountryLabelMap(
  entries: ReadonlyArray<{ code: string; name: string }> | null | undefined,
): Readonly<Record<string, string>> {
  if (!entries || entries.length === 0) return STATIC_COUNTRY_LABEL_MAP;
  const out: Record<string, string> = {};
  for (const entry of entries) {
    if (typeof entry?.code !== "string" || typeof entry?.name !== "string") {
      continue;
    }
    const upper = entry.code.trim().toUpperCase();
    if (upper.length === 0) continue;
    // CEL-406: trim the name + fall back to the canonical code when blank
    // or whitespace-only, so a malformed row can't write an empty label.
    const name = entry.name.trim();
    out[upper] = name || upper;
  }
  // Defense-in-depth: if every row was malformed, fall back to the static
  // floor rather than returning `{}` and silently dropping the documented
  // fallback labels (CEL-338 review thread — CodeRabbit + Cubic both
  // flagged the same gap). Mirrors the empty-input branch above.
  if (Object.keys(out).length === 0) return STATIC_COUNTRY_LABEL_MAP;
  return Object.freeze(out);
}

/**
 * Type guard for the canonical union. Useful in consumer code that
 * accepts `string` from upstream APIs (e.g. tender extraction) and
 * needs to narrow before persisting to a `CountryCode`-typed field.
 *
 * Returns true only when the input is **exactly** a canonical uppercase
 * code (no trim, no case normalization). A lying predicate that
 * narrowed `"fr"` to the `"FR" | "IT" | …` union would let downstream
 * code persist a value the union claims is impossible — a strict
 * lowercase-equal test on the canonical tuple is the only honest
 * signature for `value is CountryCode`. Use
 * `normalizeAndCheckCountryCode` when you want trim-and-upper behavior.
 *
 * Codes that exist in ISO-3166 but aren't in our registry (e.g. `JE`,
 * `AX`) return false on purpose — the registry is the contract.
 */
export function isCountryCode(value: unknown): value is CountryCode {
  if (typeof value !== "string") return false;
  return (COUNTRY_CODES as readonly string[]).includes(value);
}

/**
 * Trim + uppercase + canonical membership check. Returns the narrowed
 * `CountryCode` on success, `null` otherwise. Use this at API / form
 * boundaries where upstream input may be lowercase (`"fr"`) or padded
 * (`" us "`); use `isCountryCode` when you need a strict predicate
 * over an already-normalized value.
 */
export function normalizeAndCheckCountryCode(
  value: string,
): CountryCode | null {
  if (typeof value !== "string") return null;
  const upper = value.trim().toUpperCase();
  if (!(COUNTRY_CODES as readonly string[]).includes(upper)) return null;
  return upper as CountryCode;
}
