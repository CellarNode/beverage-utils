/**
 * Canonical procurement channels (CEL-343 / CEL-336).
 *
 * Mirrors `cellarnode-backend-v2/src/db/canonical/reference-data.ts` row
 * `dataId: "procurement_channels"`, `canonicalVersion: 2`. The 3 channel ids
 * here are the source of truth for both the `ProcurementChannel` typed
 * union AND the runtime registry. Keep this tuple in lockstep with the
 * backend canonical row.
 *
 * Each row carries two pieces of policy metadata that the rest of the
 * platform branches on:
 *
 * - `defaultAccessModel` — when a tender lands without an explicit
 *   `accessModel`, what should the form / matcher / pricing engine
 *   assume? (`directed` for monopoly + importer, `open` for direct.)
 * - `isMonopoly` — does this channel route through a state monopoly
 *   (Systembolaget, Vinmonopolet, LCBO, SAQ)? Affects subscription
 *   gating, recommended-price logic, and importer routing.
 *
 * Per CEL-336 acceptance criteria every canonical helper exports BOTH a
 * label formatter AND a typed union literal. For procurement channels the
 * registry rows are richer than the simple `code` / `value` shape so the
 * registry-entry interface carries the policy metadata as well.
 */
export const PROCUREMENT_CHANNELS = [
  "monopoly",
  "importer",
  "direct",
] as const;

/**
 * Typed union of every canonical procurement channel id. Consumers should
 * prefer `procurementChannel: ProcurementChannel` over `string` to get
 * exhaustiveness checks (switch statements over channel-specific routing,
 * narrowed event handlers, etc.) and to surface stale ids at compile time
 * if the registry shrinks. Per CEL-336.
 */
export type ProcurementChannel = (typeof PROCUREMENT_CHANNELS)[number];

/**
 * Access model identifier carried on each procurement channel row as its
 * `defaultAccessModel`. The full canonical access model registry lives in
 * `./access-models.ts`; the type is re-imported here so the procurement
 * registry-entry shape stays self-describing without making consumers
 * pull in two files just to read one row.
 */
import type { AccessModel } from "./access-models.js";
import { getCanonicalProcurementChannels } from "./canonical/index.js";

/**
 * One canonical procurement channel entry. `id` is the canonical id (one
 * of `PROCUREMENT_CHANNELS`); `name` is the display label backed by the
 * canonical row (`"State Monopoly"`, `"Importer"`, `"Direct"`). The
 * `defaultAccessModel` + `isMonopoly` metadata mirrors the backend row
 * verbatim — consumers branching on these fields stay in lockstep with
 * the backend regardless of whether they read the registry via the lib
 * static fallback OR the runtime hook.
 */
export interface ProcurementChannelRegistryEntry {
  id: ProcurementChannel;
  name: string;
  description?: string;
  defaultAccessModel: AccessModel;
  isMonopoly: boolean;
}

/**
 * Static fallback. The hook hydrates the runtime list from the backend,
 * but consumers rendering before the query resolves (SSR, offline, brand
 * new client with no React-Query cache) get a usable list immediately —
 * the static floor mirrors the canonical 3 rows verbatim.
 *
 * Derived from the vendored canonical JSON (CEL-1604) rather than
 * hand-typed — see `./canonical/index.ts`. `PROCUREMENT_CHANNELS` above
 * stays hand-typed (deriving the literal union would widen
 * `ProcurementChannel` to `string`); `__tests__/canonical-parity.test.ts`
 * pins that tuple against the same vendored row.
 */
export const STATIC_PROCUREMENT_CHANNEL_REGISTRY: readonly ProcurementChannelRegistryEntry[] =
  Object.freeze(getCanonicalProcurementChannels().map((entry) => Object.freeze({ ...entry })));

/**
 * Convenience tuple-typed list of just the canonical ids. Useful for
 * Zod `z.enum(PROCUREMENT_CHANNELS)`, narrowing arguments, or as a
 * cheaper fallback when consumers don't need the policy metadata.
 */
export const STATIC_PROCUREMENT_CHANNEL_FALLBACK: readonly ProcurementChannel[] =
  Object.freeze([...PROCUREMENT_CHANNELS]);

/**
 * `id → name` lookup map for the static fallback. Frozen so consumers
 * can pass it around without worrying about accidental mutation. O(1)
 * lookup for formatter / table-cell renderers.
 */
export const STATIC_PROCUREMENT_CHANNEL_LABEL_MAP: Readonly<
  Record<string, string>
> = Object.freeze(
  STATIC_PROCUREMENT_CHANNEL_REGISTRY.reduce<Record<string, string>>(
    (acc, entry) => {
      acc[entry.id] = entry.name;
      return acc;
    },
    {},
  ),
);

/**
 * Format a procurement channel id into its display label. Mirrors the
 * contract from `formatCurrencyLabel` / `formatPackagingLabel`:
 *
 * - `null` / `undefined` / empty → returns `""` (caller renders the
 *   empty cell however it wants — em-dash, "—", "None").
 * - Unknown id (not in the supplied / static label map) → echoes the
 *   trimmed input back so the user sees the raw value rather than a
 *   blank cell.
 * - Known id → returns the canonical display name.
 *
 * Case-insensitive lookup so upstream input like `"MONOPOLY"` or
 * `" Importer "` still resolves to the canonical label.
 *
 * Default `labelMap` is the canonical static map. Consumers that want
 * translated labels can build their own map via
 * `buildProcurementChannelLabelMap` and pass it as the second arg.
 */
export function formatProcurementChannelLabel(
  value: ProcurementChannel | string | null | undefined,
  labelMap: Readonly<
    Record<string, string>
  > = STATIC_PROCUREMENT_CHANNEL_LABEL_MAP,
): string {
  if (value === null || value === undefined) return "";
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (trimmed.length === 0) return "";
  // Strict lookup first (canonical ids are lowercase but consumers may
  // have richer maps with mixed casing).
  if (Object.prototype.hasOwnProperty.call(labelMap, trimmed)) {
    return labelMap[trimmed];
  }
  const lower = trimmed.toLowerCase();
  if (Object.prototype.hasOwnProperty.call(labelMap, lower)) {
    return labelMap[lower];
  }
  // Case-insensitive sweep across the map for arbitrary-cased keys.
  for (const key of Object.keys(labelMap)) {
    if (key.toLowerCase() === lower) return labelMap[key];
  }
  // Echo input back so the user sees their value rather than a blank
  // cell. Trim only — case is preserved.
  return trimmed;
}

/**
 * Build an `id → label` map from a runtime registry array. Returned as
 * a frozen plain object so consumers can pass it around as a stable
 * label source. Pure — malformed rows are skipped. Falls back to the
 * static map when every row is malformed (defense-in-depth, mirroring
 * `buildCountryLabelMap` per the CEL-338 review thread).
 *
 * Accepts both plain id arrays (`["monopoly", "importer"]`) and richer
 * `{ id, name? }` rows so consumers can carry translated labels.
 */
export function buildProcurementChannelLabelMap(
  entries:
    | ReadonlyArray<{ id: string; name?: string } | string>
    | null
    | undefined,
): Readonly<Record<string, string>> {
  if (!entries || entries.length === 0) {
    return STATIC_PROCUREMENT_CHANNEL_LABEL_MAP;
  }
  const out: Record<string, string> = {};
  for (const entry of entries) {
    if (typeof entry === "string") {
      const trimmed = entry.trim();
      if (trimmed.length === 0) continue;
      // Use canonical name if the id is known, otherwise echo the id.
      const canonical = STATIC_PROCUREMENT_CHANNEL_LABEL_MAP[trimmed];
      out[trimmed] = canonical ?? trimmed;
      continue;
    }
    if (entry === null || typeof entry !== "object") continue;
    const id = typeof entry.id === "string" ? entry.id.trim() : "";
    if (id.length === 0) continue;
    const name =
      typeof entry.name === "string" && entry.name.trim().length > 0
        ? entry.name.trim()
        : (STATIC_PROCUREMENT_CHANNEL_LABEL_MAP[id] ?? id);
    out[id] = name;
  }
  if (Object.keys(out).length === 0) {
    return STATIC_PROCUREMENT_CHANNEL_LABEL_MAP;
  }
  return Object.freeze(out);
}

/**
 * Strict type guard for the canonical union. Returns true only when the
 * input is **exactly** a canonical lowercase id (no trim, no case
 * normalisation). A lying predicate that narrowed `"Monopoly"` to the
 * `"monopoly" | "importer" | "direct"` union would let downstream code
 * persist a value the union claims is impossible — strict equality on
 * the canonical tuple is the only honest signature for
 * `value is ProcurementChannel`. Mirrors the precedent set by
 * `isCurrency` / `isCountryCode` (CEL-338 reviewer correction).
 *
 * Use `normalizeAndCheckProcurementChannel` when you want trim + lower
 * behaviour.
 */
export function isProcurementChannel(
  value: unknown,
): value is ProcurementChannel {
  if (typeof value !== "string") return false;
  return (PROCUREMENT_CHANNELS as readonly string[]).includes(value);
}

/**
 * Trim + lowercase + canonical membership check. Returns the narrowed
 * `ProcurementChannel` on success, `null` otherwise. Use this at API /
 * form boundaries where upstream input may be uppercase (`"MONOPOLY"`)
 * or padded (`" importer "`); use `isProcurementChannel` when you need a
 * strict predicate over an already-normalised value.
 */
export function normalizeAndCheckProcurementChannel(
  value: string,
): ProcurementChannel | null {
  if (typeof value !== "string") return null;
  const lower = value.trim().toLowerCase();
  if (!(PROCUREMENT_CHANNELS as readonly string[]).includes(lower)) {
    return null;
  }
  return lower as ProcurementChannel;
}

/**
 * Look up a full registry entry by id. Returns `null` when the id is
 * unknown so consumers can fall back to a default without throwing.
 * Convenience for code that needs the policy metadata
 * (`defaultAccessModel`, `isMonopoly`) for a known channel.
 */
export function getProcurementChannelEntry(
  id: ProcurementChannel | string | null | undefined,
  registry: ReadonlyArray<ProcurementChannelRegistryEntry> = STATIC_PROCUREMENT_CHANNEL_REGISTRY,
): ProcurementChannelRegistryEntry | null {
  if (id === null || id === undefined) return null;
  if (typeof id !== "string") return null;
  const trimmed = id.trim();
  if (trimmed.length === 0) return null;
  const direct = registry.find((entry) => entry.id === trimmed);
  if (direct) return direct;
  const lower = trimmed.toLowerCase();
  return registry.find((entry) => entry.id === lower) ?? null;
}
