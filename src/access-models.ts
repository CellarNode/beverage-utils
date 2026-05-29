/**
 * Canonical access models (CEL-343 / CEL-336).
 *
 * Mirrors `cellarnode-backend-v2/src/db/canonical/reference-data.ts` row
 * `dataId: "access_models"`, `canonicalVersion: 1`. The 2 access model ids
 * here are the source of truth for both the `AccessModel` typed union AND
 * the runtime registry. Keep this tuple in lockstep with the backend
 * canonical row.
 *
 * Access models describe how offer selection works for a given tender /
 * opportunity:
 *
 * - `directed` — offers routed through a recommended or designated
 *   importer(s). Used for monopoly + importer procurement channels.
 * - `open` — free competition; any eligible party can submit price +
 *   terms. Used for direct procurement.
 *
 * Per CEL-336 acceptance criteria every canonical helper exports BOTH a
 * label formatter AND a typed union literal.
 */
export const ACCESS_MODELS = ["directed", "open"] as const;

/**
 * Typed union of every canonical access model id. Consumers should
 * prefer `accessModel: AccessModel` over `string` to get exhaustiveness
 * checks (switch statements over routing logic, narrowed signal
 * handlers) and to surface stale ids at compile time if the registry
 * shrinks. Per CEL-336.
 */
export type AccessModel = (typeof ACCESS_MODELS)[number];

/**
 * One canonical access model entry. `id` is the canonical id (one of
 * `ACCESS_MODELS`); `name` is the display label backed by the canonical
 * row (`"Directed"` / `"Open"`). Description carries the long-form
 * explanation used in admin UI / tooltips.
 */
export interface AccessModelRegistryEntry {
  id: AccessModel;
  name: string;
  description?: string;
}

/**
 * Static fallback. The hook hydrates the runtime list from the backend,
 * but consumers rendering before the query resolves (SSR, offline, brand
 * new client with no React-Query cache) get a usable list immediately —
 * the static floor mirrors the canonical 2 rows verbatim.
 */
export const STATIC_ACCESS_MODEL_REGISTRY: readonly AccessModelRegistryEntry[] =
  Object.freeze([
    Object.freeze({
      id: "directed",
      name: "Directed",
      description:
        "Offers routed through recommended or designated importer(s)",
    }),
    Object.freeze({
      id: "open",
      name: "Open",
      description:
        "Free competition — any eligible party can compete on price and terms",
    }),
  ]);

/**
 * Convenience tuple-typed list of just the canonical ids. Useful for
 * Zod `z.enum(ACCESS_MODELS)`, narrowing arguments, or as a cheaper
 * fallback when consumers don't need the metadata.
 */
export const STATIC_ACCESS_MODEL_FALLBACK: readonly AccessModel[] = Object.freeze([
  ...ACCESS_MODELS,
]);

/**
 * `id → name` lookup map for the static fallback. Frozen so consumers
 * can pass it around without worrying about accidental mutation. O(1)
 * lookup for formatter / table-cell renderers.
 */
export const STATIC_ACCESS_MODEL_LABEL_MAP: Readonly<Record<string, string>> =
  Object.freeze(
    STATIC_ACCESS_MODEL_REGISTRY.reduce<Record<string, string>>(
      (acc, entry) => {
        acc[entry.id] = entry.name;
        return acc;
      },
      {},
    ),
  );

/**
 * Format an access model id into its display label. Mirrors the
 * contract from `formatProcurementChannelLabel`:
 *
 * - `null` / `undefined` / empty → returns `""`.
 * - Unknown id (not in the supplied / static label map) → echoes the
 *   trimmed input back.
 * - Known id → returns the canonical display name.
 *
 * Case-insensitive lookup so `"DIRECTED"` and `" Open "` resolve to the
 * canonical labels.
 *
 * Default `labelMap` is the canonical static map. Consumers that want
 * translated labels can build their own map via
 * `buildAccessModelLabelMap` and pass it as the second arg.
 */
export function formatAccessModelLabel(
  value: AccessModel | string | null | undefined,
  labelMap: Readonly<
    Record<string, string>
  > = STATIC_ACCESS_MODEL_LABEL_MAP,
): string {
  if (value === null || value === undefined) return "";
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (trimmed.length === 0) return "";
  if (Object.prototype.hasOwnProperty.call(labelMap, trimmed)) {
    return labelMap[trimmed];
  }
  const lower = trimmed.toLowerCase();
  if (Object.prototype.hasOwnProperty.call(labelMap, lower)) {
    return labelMap[lower];
  }
  for (const key of Object.keys(labelMap)) {
    if (key.toLowerCase() === lower) return labelMap[key];
  }
  return trimmed;
}

/**
 * Build an `id → label` map from a runtime registry array. Returned as
 * a frozen plain object. Pure — malformed rows are skipped. Falls back
 * to the static map when every row is malformed (defense-in-depth,
 * mirroring `buildCountryLabelMap` per the CEL-338 review thread).
 *
 * Accepts both plain id arrays (`["directed", "open"]`) and richer
 * `{ id, name? }` rows so consumers can carry translated labels.
 */
export function buildAccessModelLabelMap(
  entries:
    | ReadonlyArray<{ id: string; name?: string } | string>
    | null
    | undefined,
): Readonly<Record<string, string>> {
  if (!entries || entries.length === 0) {
    return STATIC_ACCESS_MODEL_LABEL_MAP;
  }
  const out: Record<string, string> = {};
  for (const entry of entries) {
    if (typeof entry === "string") {
      const trimmed = entry.trim();
      if (trimmed.length === 0) continue;
      const canonical = STATIC_ACCESS_MODEL_LABEL_MAP[trimmed];
      out[trimmed] = canonical ?? trimmed;
      continue;
    }
    if (entry === null || typeof entry !== "object") continue;
    const id = typeof entry.id === "string" ? entry.id.trim() : "";
    if (id.length === 0) continue;
    const name =
      typeof entry.name === "string" && entry.name.trim().length > 0
        ? entry.name.trim()
        : (STATIC_ACCESS_MODEL_LABEL_MAP[id] ?? id);
    out[id] = name;
  }
  if (Object.keys(out).length === 0) {
    return STATIC_ACCESS_MODEL_LABEL_MAP;
  }
  return Object.freeze(out);
}

/**
 * Strict type guard for the canonical union. Returns true only when the
 * input is **exactly** a canonical lowercase id (no trim, no case
 * normalisation). A lying predicate would narrow `"Directed"` to the
 * `"directed" | "open"` union, letting downstream code persist a value
 * the union claims is impossible. Strict equality on the canonical
 * tuple is the only honest signature for `value is AccessModel`.
 *
 * Use `normalizeAndCheckAccessModel` when you want trim + lower
 * behaviour.
 */
export function isAccessModel(value: unknown): value is AccessModel {
  if (typeof value !== "string") return false;
  return (ACCESS_MODELS as readonly string[]).includes(value);
}

/**
 * Trim + lowercase + canonical membership check. Returns the narrowed
 * `AccessModel` on success, `null` otherwise. Use this at API / form
 * boundaries where upstream input may be uppercase (`"DIRECTED"`) or
 * padded (`" open "`).
 */
export function normalizeAndCheckAccessModel(
  value: string,
): AccessModel | null {
  if (typeof value !== "string") return null;
  const lower = value.trim().toLowerCase();
  if (!(ACCESS_MODELS as readonly string[]).includes(lower)) return null;
  return lower as AccessModel;
}

/**
 * Look up a full registry entry by id. Returns `null` when the id is
 * unknown so consumers can fall back to a default without throwing.
 */
export function getAccessModelEntry(
  id: AccessModel | string | null | undefined,
  registry: ReadonlyArray<AccessModelRegistryEntry> = STATIC_ACCESS_MODEL_REGISTRY,
): AccessModelRegistryEntry | null {
  if (id === null || id === undefined) return null;
  if (typeof id !== "string") return null;
  const trimmed = id.trim();
  if (trimmed.length === 0) return null;
  const direct = registry.find((entry) => entry.id === trimmed);
  if (direct) return direct;
  const lower = trimmed.toLowerCase();
  return registry.find((entry) => entry.id === lower) ?? null;
}
