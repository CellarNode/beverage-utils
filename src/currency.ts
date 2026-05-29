/**
 * Canonical active currencies (CEL-341 / CEL-336).
 *
 * Mirrors `cellarnode-backend-v2/src/db/canonical/reference-data.ts` row
 * with `dataId: "active_currencies"`. The 12 ISO-4217 codes here are the
 * source of truth for the runtime list AND the `Currency` union — keep
 * this tuple in lockstep with the backend canonical row.
 *
 * Background — CEL-341 (currency convergence) replaces three competing
 * lists across the codebase:
 *
 *   1. **Canonical** — the `active_currencies` reference-data row
 *      (this tuple).
 *   2. **Static lib const** — `COMMON_CURRENCIES` in `src/lib/currencies.ts`
 *      (10 codes, missing PLN/CZK; deprecated in this slice, kept for
 *      backward compat).
 *   3. **Backend regex** — `cellarnode-backend-v2/src/lib/product-input-
 *      validation.ts` used `/^[A-Z]{3}$/`, accepting any 3-letter sequence
 *      (tightened to `z.enum(ACTIVE_CURRENCIES)` in the sibling backend PR).
 *
 * Per CEL-336 acceptance criteria every canonical helper exports BOTH a
 * label formatter AND a typed union literal. Currencies are slightly
 * special: the canonical code IS the display label most of the time
 * (`"EUR"` → `"EUR"`); consumers that want richer labels (`"EUR — Euro"`)
 * can build their own map and pass it to `formatCurrencyLabel`.
 */
export const ACTIVE_CURRENCIES = [
  "EUR",
  "SEK",
  "USD",
  "GBP",
  "NOK",
  "DKK",
  "CHF",
  "PLN",
  "CZK",
  "CAD",
  "AUD",
  "JPY",
] as const;

/**
 * Typed union of every canonical active currency code. Consumers should
 * prefer `currency: Currency` over `currency: string` to get
 * exhaustiveness checks and to surface stale codes at compile time when
 * the registry shrinks. Per CEL-336.
 */
export type Currency = (typeof ACTIVE_CURRENCIES)[number];

/**
 * Static fallback. The hook hydrates the runtime list from the backend,
 * but consumers rendering before the query resolves (SSR, offline, brand
 * new client with no React-Query cache) get a usable list immediately —
 * the static floor mirrors the canonical 12 rows verbatim.
 */
export const STATIC_CURRENCY_FALLBACK: readonly Currency[] = Object.freeze([
  ...ACTIVE_CURRENCIES,
]);

/**
 * One canonical currency entry. `code` is always one of the canonical
 * ISO-4217 codes; `label` is the display label. For currencies the two
 * are equal by default — the wrapper shape exists so the registry
 * interface mirrors `CountryRegistryEntry` and stays open to future
 * divergence (e.g. translated long names: `"EUR — Euro"` / `"USD — US
 * Dollar"`).
 */
export interface CurrencyRegistryEntry {
  code: Currency;
  /**
   * Display label. Defaults to the canonical code; consumers may pass a
   * richer label (`"EUR — Euro"`) when building their own runtime map.
   */
  label: string;
}

/**
 * Pre-built registry for the picker components. Same order as the
 * canonical backend row.
 */
export const STATIC_CURRENCY_REGISTRY: readonly CurrencyRegistryEntry[] =
  Object.freeze(ACTIVE_CURRENCIES.map((code) => Object.freeze({ code, label: code })));

/**
 * `code → label` lookup map for the static fallback. Frozen so consumers
 * can pass it around without worrying about accidental mutation. O(1)
 * lookup for formatter / table-cell renderers.
 */
export const STATIC_CURRENCY_LABEL_MAP: Readonly<Record<string, string>> =
  Object.freeze(
    ACTIVE_CURRENCIES.reduce<Record<string, string>>((acc, code) => {
      acc[code] = code;
      return acc;
    }, {}),
  );

/**
 * Format a currency code into its display label. Mirrors the contract
 * from `formatCountryLabel` / `formatPackagingLabel`:
 *
 * - `null` / `undefined` / empty → returns `""` (caller renders the
 *   empty cell however it wants — em-dash, "—", "None").
 * - Unknown code (not in the supplied / static label map) → echoes the
 *   input back so the user sees the raw value rather than a blank cell.
 * - Known code → returns the canonical display label.
 *
 * For currencies, the canonical code IS the label by default
 * (`"EUR"` → `"EUR"`). Consumers that want long-form names can build a
 * map (`{ EUR: "EUR — Euro", USD: "USD — US Dollar" }`) and pass it as
 * the second arg.
 *
 * The default `labelMap` is the canonical static map. Pass a richer map
 * (e.g. `buildCurrencyLabelMap(query.data)` with consumer-supplied long
 * names) when you want long-form labels.
 */
export function formatCurrencyLabel(
  code: Currency | string | null | undefined,
  labelMap: Readonly<Record<string, string>> = STATIC_CURRENCY_LABEL_MAP,
): string {
  if (code === null || code === undefined) return "";
  if (typeof code !== "string") return "";
  const trimmed = code.trim();
  if (trimmed.length === 0) return "";
  const upper = trimmed.toUpperCase();
  return labelMap[upper] ?? trimmed;
}

/**
 * Build a `code → label` map from a runtime registry array. Returned as
 * a frozen plain object so consumers can pass it around as a stable
 * label source. Pure — malformed rows are skipped. Falls back to the
 * static map when every row is malformed (defense-in-depth, mirroring
 * `buildCountryLabelMap`).
 *
 * Accepts both plain string arrays (`["EUR", "USD"]`) and
 * `{ code, label }` rows so consumers can carry richer labels when they
 * have them without forcing the simple case to wrap each code into an
 * object.
 */
export function buildCurrencyLabelMap(
  entries:
    | ReadonlyArray<{ code: string; label?: string } | string>
    | null
    | undefined,
): Readonly<Record<string, string>> {
  if (!entries || entries.length === 0) return STATIC_CURRENCY_LABEL_MAP;
  const out: Record<string, string> = {};
  for (const entry of entries) {
    if (typeof entry === "string") {
      const upper = entry.trim().toUpperCase();
      if (upper.length === 0) continue;
      out[upper] = upper;
      continue;
    }
    if (entry === null || typeof entry !== "object") continue;
    const code =
      typeof entry.code === "string" ? entry.code.trim().toUpperCase() : "";
    if (code.length === 0) continue;
    const label =
      typeof entry.label === "string" && entry.label.trim().length > 0
        ? entry.label.trim()
        : code;
    out[code] = label;
  }
  // Defense-in-depth: if every row was malformed, fall back to the static
  // floor rather than returning `{}` and silently dropping the documented
  // fallback labels. Mirrors `buildCountryLabelMap` per the CEL-338 review
  // thread (CodeRabbit + Cubic both flagged the same gap).
  if (Object.keys(out).length === 0) return STATIC_CURRENCY_LABEL_MAP;
  return Object.freeze(out);
}

/**
 * Strict type guard for the canonical union. Returns true only when the
 * input is **exactly** a canonical uppercase ISO-4217 code (no trim, no
 * case normalisation). A lying predicate that narrowed `"eur"` to the
 * `"EUR" | "USD" | …` union would let downstream code persist a value
 * the union claims is impossible — a strict equal test on the canonical
 * tuple is the only honest signature for `value is Currency`. Mirrors
 * the precedent set by `isCountryCode` (CEL-338 reviewer correction).
 *
 * Use `normalizeAndCheckCurrency` when you want trim-and-upper behaviour.
 *
 * Codes that exist in ISO-4217 but aren't in our active registry
 * (e.g. `"BTC"`, `"XAU"`, `"INR"`) return false on purpose — the
 * registry is the contract.
 */
export function isCurrency(value: unknown): value is Currency {
  if (typeof value !== "string") return false;
  return (ACTIVE_CURRENCIES as readonly string[]).includes(value);
}

/**
 * Trim + uppercase + canonical membership check. Returns the narrowed
 * `Currency` on success, `null` otherwise. Use this at API / form
 * boundaries where upstream input may be lowercase (`"eur"`) or padded
 * (`" usd "`); use `isCurrency` when you need a strict predicate over
 * an already-normalised value.
 */
export function normalizeAndCheckCurrency(value: string): Currency | null {
  if (typeof value !== "string") return null;
  const upper = value.trim().toUpperCase();
  if (!(ACTIVE_CURRENCIES as readonly string[]).includes(upper)) return null;
  return upper as Currency;
}
