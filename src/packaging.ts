/**
 * Canonical packaging options (CEL-340 / CEL-336).
 *
 * Mirrors `cellarnode-backend-v2/apps/cellarnode/src/db/canonical/reference-data.ts` row
 * with `dataId: "packaging_options"`. The strings here are the source of
 * truth for the runtime list AND the `Packaging` union — keep this tuple
 * in lockstep with the backend canonical row.
 *
 * Per CEL-336 acceptance criteria, every canonical helper exports BOTH a
 * label formatter AND a typed union literal. For packaging the canonical
 * string IS the label, so the formatter is essentially identity (with
 * nullish + non-string + unknown-echo handling preserved for parity with
 * `formatCountryLabel` / `formatEnterpriseTypeLabel`).
 *
 * Note: the canonical strings carry mixed casing (`"PET"` is upper, `"BiB
 * (Bag-in-Box)"` is mixed, `"Light-weight glass bottle"` is sentence case).
 * Simple uppercase normalisation breaks those values, so we expose a
 * strict predicate plus a lenient case-insensitive lookup that returns the
 * canonical-cased string when found.
 */
export const PACKAGING_OPTIONS = [
  "PET",
  "BiB (Bag-in-Box)",
  "Glass",
  "Aluminum",
  "Light-weight glass bottle",
  "Cardboard packaging",
  "Cardboard bottle",
  "Pouch",
  "Returnable glass bottle",
] as const;

/**
 * Typed union of every canonical packaging value. Consumers should prefer
 * `packaging: Packaging` over `packaging: string` to get exhaustiveness
 * checks (switch statements, narrowed signal handlers) and to surface
 * stale values at compile time if the registry shrinks.
 */
export type Packaging = (typeof PACKAGING_OPTIONS)[number];

/**
 * Descriptive properties only. A missing form or returnability is unknown,
 * never evidence that the package is not a bottle or is not returnable.
 * Deposit-system eligibility and allowed substitutions are tender rules,
 * not intrinsic properties of these packaging identities.
 */
export interface PackagingAttributes {
  material: "pet" | "glass" | "aluminum" | "cardboard" | null;
  form: "bottle" | "bag-in-box" | "pouch" | null;
  returnability: "returnable" | "unspecified";
}

/**
 * CEL-2072: keep general cardboard distinct from bottle-format cardboard,
 * and returnable glass distinct from glass with no stated return obligation.
 * `null` means the canonical label does not establish that property.
 */
export const PACKAGING_ATTRIBUTES: Readonly<Record<Packaging, Readonly<PackagingAttributes>>> = Object.freeze({
  PET: Object.freeze({ material: "pet", form: null, returnability: "unspecified" }),
  "BiB (Bag-in-Box)": Object.freeze({ material: null, form: "bag-in-box", returnability: "unspecified" }),
  Glass: Object.freeze({ material: "glass", form: null, returnability: "unspecified" }),
  Aluminum: Object.freeze({ material: "aluminum", form: null, returnability: "unspecified" }),
  "Light-weight glass bottle": Object.freeze({ material: "glass", form: "bottle", returnability: "unspecified" }),
  "Cardboard packaging": Object.freeze({ material: "cardboard", form: null, returnability: "unspecified" }),
  "Cardboard bottle": Object.freeze({ material: "cardboard", form: "bottle", returnability: "unspecified" }),
  Pouch: Object.freeze({ material: null, form: "pouch", returnability: "unspecified" }),
  "Returnable glass bottle": Object.freeze({ material: "glass", form: "bottle", returnability: "returnable" }),
});

/**
 * Static fallback. The hook hydrates the runtime list from the backend,
 * but consumers rendering before the query resolves (SSR, offline, brand
 * new client with no React-Query cache) get a usable list immediately —
 * the static floor mirrors the canonical row verbatim.
 */
export const STATIC_PACKAGING_FALLBACK: readonly Packaging[] = Object.freeze([
  ...PACKAGING_OPTIONS,
]);

/**
 * One canonical packaging entry. `value` is always one of the canonical
 * strings; `label` is the display label. For packaging the two are equal
 * — backend stores the human-readable string as the identity. The wrapper
 * shape exists so the registry interface mirrors `CountryRegistryEntry`
 * and stays open to future divergence (e.g. translated labels).
 */
export interface PackagingRegistryEntry {
  value: Packaging;
  label: string;
}

/**
 * Pre-built registry for the picker components. Same order as the
 * canonical backend row.
 */
export const STATIC_PACKAGING_REGISTRY: readonly PackagingRegistryEntry[] =
  Object.freeze(PACKAGING_OPTIONS.map((value) => Object.freeze({ value, label: value })));

/**
 * `value → label` lookup map for the static fallback. Frozen so consumers
 * can pass it around without worrying about accidental mutation. O(1)
 * lookup for formatter / table-cell renderers.
 */
export const STATIC_PACKAGING_LABEL_MAP: Readonly<Record<string, string>> =
  Object.freeze(
    PACKAGING_OPTIONS.reduce<Record<string, string>>((acc, value) => {
      acc[value] = value;
      return acc;
    }, {}),
  );

/**
 * Format a packaging value into its display label. Mirrors the contract
 * from `formatCountryLabel` / CEL-337's `formatEnterpriseTypeLabel`:
 *
 * - `null` / `undefined` / empty → returns `""`.
 * - Unknown value (not in the supplied / static label map) → echoes the
 *   input back. This is the contract that makes "Other (free text)" work
 *   transparently: a producer's custom packaging string flows through
 *   the formatter unchanged.
 * - Known value → returns the canonical display label.
 */
export function formatPackagingLabel(
  value: Packaging | string | null | undefined,
  labelMap: Readonly<Record<string, string>> = STATIC_PACKAGING_LABEL_MAP,
): string {
  if (value === null || value === undefined) return "";
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (trimmed.length === 0) return "";
  // Strict lookup first (canonical strings carry mixed casing — see header).
  if (Object.prototype.hasOwnProperty.call(labelMap, trimmed)) {
    return labelMap[trimmed];
  }
  // Case-insensitive fallback — find a key that matches when both sides
  // are lowercased. Lets `"pet"` resolve to `"PET"` without forcing
  // upstream callers to normalise.
  const lower = trimmed.toLowerCase();
  for (const key of Object.keys(labelMap)) {
    if (key.toLowerCase() === lower) return labelMap[key];
  }
  // Echo input back so the user sees their value rather than a blank
  // cell. Handles the "Other (free text)" path transparently.
  return trimmed;
}

/**
 * Build a `value → label` map from a runtime registry array. Returned as
 * a frozen plain object so consumers can pass it around as a stable
 * label source. Pure — malformed rows are skipped. Falls back to the
 * static map when every row is malformed (defense-in-depth, mirroring
 * `buildCountryLabelMap`).
 */
export function buildPackagingLabelMap(
  entries:
    | ReadonlyArray<{ value: string; label?: string } | string>
    | null
    | undefined,
): Readonly<Record<string, string>> {
  if (!entries || entries.length === 0) return STATIC_PACKAGING_LABEL_MAP;
  const out: Record<string, string> = {};
  for (const entry of entries) {
    if (typeof entry === "string") {
      const trimmed = entry.trim();
      if (trimmed.length === 0) continue;
      out[trimmed] = trimmed;
      continue;
    }
    if (entry === null || typeof entry !== "object") continue;
    const value =
      typeof entry.value === "string" ? entry.value.trim() : "";
    if (value.length === 0) continue;
    const label =
      typeof entry.label === "string" && entry.label.trim().length > 0
        ? entry.label.trim()
        : value;
    out[value] = label;
  }
  if (Object.keys(out).length === 0) return STATIC_PACKAGING_LABEL_MAP;
  return Object.freeze(out);
}

/**
 * Strict type guard. Returns true only when the input is **exactly** a
 * canonical packaging string. A lying predicate that narrowed `"pet"` to
 * `Packaging` would let downstream code persist a value the union claims
 * is impossible. Use `normalizeAndCheckPackaging` for trim + case-
 * insensitive behaviour.
 */
export function isPackaging(value: unknown): value is Packaging {
  if (typeof value !== "string") return false;
  return (PACKAGING_OPTIONS as readonly string[]).includes(value);
}

/**
 * Trim + case-insensitive membership check. Returns the canonical-cased
 * `Packaging` on success, `null` otherwise. Use this at API / form
 * boundaries where upstream input may be lowercased (`"pet"`) or padded
 * (`" Glass "`); use `isPackaging` when you need a strict predicate over
 * an already-normalised value.
 *
 * Because the canonical strings have mixed casing, the function compares
 * lowercased input against lowercased canonical entries and returns the
 * canonical-cased version when matched.
 */
export function normalizeAndCheckPackaging(
  value: string,
): Packaging | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  const lower = trimmed.toLowerCase();
  for (const canonical of PACKAGING_OPTIONS) {
    if (canonical.toLowerCase() === lower) return canonical;
  }
  return null;
}

/**
 * Exact terms from the user-provided `tenders-June-2027-English-Readable.pdf`
 * (Systembolaget June 2027 launch tender, pp 2 and 51). These aliases
 * identify a single package; this function deliberately does not parse
 * alternatives, conditions, or substitutions from a full clause.
 */
const TENDER_PACKAGING_ALIASES: Readonly<Record<string, Packaging>> = Object.freeze({
  "cardboard packaging in bottle format": "Cardboard bottle", // PDF p2
  "return glass": "Returnable glass bottle", // PDF p51, confirmed by heading
});

/**
 * Resolve one unambiguous package term to a canonical identity. Returns
 * `null` for broad terms such as "cardboard", compound clauses, and unknown
 * packages so callers can keep the raw tender evidence for review.
 */
export function normalizeTenderPackagingTerm(value: string): Packaging | null {
  const canonical = normalizeAndCheckPackaging(value);
  if (canonical) return canonical;
  if (typeof value !== "string") return null;
  const key = value.trim().toLowerCase().replace(/\s+/g, " ");
  return Object.prototype.hasOwnProperty.call(TENDER_PACKAGING_ALIASES, key)
    ? TENDER_PACKAGING_ALIASES[key]
    : null;
}
