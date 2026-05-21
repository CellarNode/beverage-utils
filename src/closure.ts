/**
 * Canonical closure options (CEL-340 / CEL-336).
 *
 * Mirrors `cellarnode-backend-v2/src/db/canonical/reference-data.ts` row
 * with `dataId: "closure_options"`. The 6 strings here are the source of
 * truth for the runtime list AND the `Closure` union — keep this tuple
 * in lockstep with the backend canonical row.
 *
 * One subtle wrinkle vs `PACKAGING_OPTIONS`: the canonical closure list
 * itself contains a literal `"Other"` row. That is NOT the lib's "Other
 * (free text)" escape hatch — it's a canonical option meaning "an
 * unspecified or rare closure type". The `<ClosureSelect>` component's
 * `allowOther` sentinel uses a separate `__other__` internal value to
 * trigger the free-text path; the two never collide.
 */
export const CLOSURE_OPTIONS = [
  "Natural cork",
  "Technical cork",
  "Screw cap",
  "Glass closure",
  "Crown cap",
  "Other",
] as const;

/**
 * Typed union of every canonical closure value.
 */
export type Closure = (typeof CLOSURE_OPTIONS)[number];

/**
 * Static fallback used when the backend query hasn't resolved yet.
 */
export const STATIC_CLOSURE_FALLBACK: readonly Closure[] = [
  ...CLOSURE_OPTIONS,
];

/**
 * One canonical closure entry — see `PackagingRegistryEntry` for shape
 * rationale.
 */
export interface ClosureRegistryEntry {
  value: Closure;
  label: string;
}

/**
 * Pre-built registry for the picker components. Same order as the
 * canonical backend row.
 */
export const STATIC_CLOSURE_REGISTRY: readonly ClosureRegistryEntry[] =
  CLOSURE_OPTIONS.map((value) => ({ value, label: value }));

/**
 * `value → label` lookup map for the static fallback. Frozen so consumers
 * can pass it around without worrying about accidental mutation.
 */
export const STATIC_CLOSURE_LABEL_MAP: Readonly<Record<string, string>> =
  Object.freeze(
    CLOSURE_OPTIONS.reduce<Record<string, string>>((acc, value) => {
      acc[value] = value;
      return acc;
    }, {}),
  );

/**
 * Format a closure value into its display label. Mirrors
 * `formatPackagingLabel` — see there for the full contract.
 */
export function formatClosureLabel(
  value: Closure | string | null | undefined,
  labelMap: Readonly<Record<string, string>> = STATIC_CLOSURE_LABEL_MAP,
): string {
  if (value === null || value === undefined) return "";
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (trimmed.length === 0) return "";
  if (Object.prototype.hasOwnProperty.call(labelMap, trimmed)) {
    return labelMap[trimmed];
  }
  const lower = trimmed.toLowerCase();
  for (const key of Object.keys(labelMap)) {
    if (key.toLowerCase() === lower) return labelMap[key];
  }
  return trimmed;
}

/**
 * Build a `value → label` map from a runtime registry array. Mirrors
 * `buildPackagingLabelMap`.
 */
export function buildClosureLabelMap(
  entries:
    | ReadonlyArray<{ value: string; label?: string } | string>
    | null
    | undefined,
): Readonly<Record<string, string>> {
  if (!entries || entries.length === 0) return STATIC_CLOSURE_LABEL_MAP;
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
  if (Object.keys(out).length === 0) return STATIC_CLOSURE_LABEL_MAP;
  return Object.freeze(out);
}

/**
 * Strict type guard. Returns true only for exact canonical closure
 * strings — see `isPackaging` for the rationale behind strictness.
 */
export function isClosure(value: unknown): value is Closure {
  if (typeof value !== "string") return false;
  return (CLOSURE_OPTIONS as readonly string[]).includes(value);
}

/**
 * Trim + case-insensitive membership check. Returns the canonical-cased
 * `Closure` on success, `null` otherwise. Mirrors
 * `normalizeAndCheckPackaging`.
 */
export function normalizeAndCheckClosure(value: string): Closure | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  const lower = trimmed.toLowerCase();
  for (const canonical of CLOSURE_OPTIONS) {
    if (canonical.toLowerCase() === lower) return canonical;
  }
  return null;
}
