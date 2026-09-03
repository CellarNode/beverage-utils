/**
 * Typed accessor over the vendored backend canonical reference-data JSON
 * (CEL-1604 D13/D27).
 *
 * `reference-data.json` in this directory is a deterministic copy of
 * `cellarnode-backend-v2`'s generated
 * `apps/cellarnode/src/db/canonical/reference-data.json` — sorted by
 * `dataId` and re-serialized with a stable indent, not a byte-for-byte
 * copy (see `SYNC.md` for provenance + `pnpm sync-canonical` to refresh
 * it). It is the single source of truth this package's hand-typed statics
 * are checked against — `__tests__/canonical-parity.test.ts` deep-equals
 * every shipped static against the accessors below so drift between the
 * two fails loudly.
 *
 * Every public static this package ships stays **hand-typed** (`AccessModel`,
 * `Packaging`, `Closure`, `Currency`, `ProcurementChannel`, `CountryCode`
 * literal unions, and the richer `STATIC_ACCESS_MODEL_REGISTRY` /
 * `STATIC_PROCUREMENT_CHANNEL_REGISTRY` / enterprise-type label map
 * registries) rather than derived from this runtime JSON import — deriving
 * pulls the whole vendored JSON into any consumer's bundle, because no
 * bundler can prove `Object.freeze(getCanonicalX().map(...))` pure and drop
 * the now-reached JSON module (CEL-1604 review fixup, P0-1). The parity
 * test pins every hand-typed static against the accessors below instead:
 * any drift from the vendored row fails a test, with zero runtime cost to
 * consumers.
 *
 * This module is intentionally **not** re-exported from the package root
 * and is not imported by any shipped module — it is purely an internal,
 * test-only seam for `__tests__/canonical-parity.test.ts` and for
 * `scripts/generate-classifications.mjs` (via the vendored JSON file
 * directly, not this module). The one accessor `@cellarnode/ui`'s
 * opportunity wizard needs, `getCanonicalClassifications()`, lives in
 * `../classifications.ts` instead, backed by a generated literal rather
 * than this runtime JSON — see that module's doc comment.
 */
import referenceData from "./reference-data.json" with { type: "json" };
import type { AccessModel } from "../access-models.js";
import type { ProcurementChannel } from "../procurement-channels.js";

/** `$meta.schemaVersion` this package's accessors are written against. */
export const SUPPORTED_CANONICAL_SCHEMA_VERSION = 1;

export interface CanonicalMeta {
  readonly generator: string;
  readonly sourceFile: string;
  readonly schemaVersion: number;
  readonly entryCount: number;
}

export interface CanonicalRow<T = unknown> {
  readonly dataId: string;
  readonly canonicalVersion: number;
  readonly jsonData: T;
}

interface CanonicalReferenceData {
  readonly $meta: CanonicalMeta;
  readonly data: readonly CanonicalRow[];
}

const REFERENCE_DATA = referenceData as unknown as CanonicalReferenceData;

/** `$meta` block of the vendored canonical JSON — generator, source file, schema version, row count. */
export const CANONICAL_META: Readonly<CanonicalMeta> = Object.freeze({
  ...REFERENCE_DATA.$meta,
});

if (CANONICAL_META.schemaVersion !== SUPPORTED_CANONICAL_SCHEMA_VERSION) {
  throw new Error(
    `@cellarnode/beverage-utils: vendored src/canonical/reference-data.json has ` +
      `schemaVersion ${CANONICAL_META.schemaVersion}, but this package's accessors ` +
      `only support schemaVersion ${SUPPORTED_CANONICAL_SCHEMA_VERSION}. Re-run ` +
      `\`pnpm sync-canonical\` against a compatible backend commit and update ` +
      `src/canonical/index.ts (and SUPPORTED_CANONICAL_SCHEMA_VERSION) before publishing.`,
  );
}

if (CANONICAL_META.entryCount !== REFERENCE_DATA.data.length) {
  throw new Error(
    `@cellarnode/beverage-utils: vendored src/canonical/reference-data.json is ` +
      `internally inconsistent — $meta.entryCount (${CANONICAL_META.entryCount}) does ` +
      `not match data.length (${REFERENCE_DATA.data.length}). Re-run \`pnpm sync-canonical\`.`,
  );
}

/**
 * Every vendored canonical row, sorted by `dataId` (the vendored file's
 * native order — never rely on array position, always key off `dataId`).
 */
export function listCanonicalRows(): readonly CanonicalRow[] {
  return REFERENCE_DATA.data;
}

/**
 * Look up one vendored canonical row by its `dataId`. Returns `undefined`
 * when the id isn't present so callers can decide their own fallback
 * rather than throwing on a row this package doesn't ship a static for.
 */
export function getCanonicalRow<T = unknown>(dataId: string): CanonicalRow<T> | undefined {
  return REFERENCE_DATA.data.find((row) => row.dataId === dataId) as
    | CanonicalRow<T>
    | undefined;
}

/** Throws with a message naming the missing row + the fix (re-sync). */
function requireCanonicalRow<T>(dataId: string): CanonicalRow<T> {
  const row = getCanonicalRow<T>(dataId);
  if (!row) {
    throw new Error(
      `@cellarnode/beverage-utils: expected canonical row "${dataId}" is missing from ` +
        `the vendored reference-data.json. Re-run \`pnpm sync-canonical\` against a ` +
        `backend commit that still ships this row.`,
    );
  }
  return row;
}

// ---------------------------------------------------------------------------
// Per-domain typed accessors — one per canonical row this package ships a
// static for. Each mirrors the shape backend-v2's reference-data.ts emits;
// see reference-data.json for the raw rows.
// ---------------------------------------------------------------------------

interface AccessModelsJson {
  readonly description: string;
  readonly version: number;
  readonly options: ReadonlyArray<{
    readonly id: string;
    readonly name: string;
    readonly description?: string;
  }>;
}

/** `id`/`name`/`description` rows backing `STATIC_ACCESS_MODEL_REGISTRY`. `id` is cast to `AccessModel` — the parity test is what proves that cast honest. */
export function getCanonicalAccessModels(): ReadonlyArray<{
  id: AccessModel;
  name: string;
  description?: string;
}> {
  const { jsonData } = requireCanonicalRow<AccessModelsJson>("access_models");
  return jsonData.options.map((o) => ({
    id: o.id as AccessModel,
    name: o.name,
    description: o.description,
  }));
}

interface ProcurementChannelsJson {
  readonly description: string;
  readonly version: number;
  readonly options: ReadonlyArray<{
    readonly id: string;
    readonly name: string;
    readonly description?: string;
    readonly defaultAccessModel: string;
    readonly isMonopoly: boolean;
  }>;
}

/** Rows backing `STATIC_PROCUREMENT_CHANNEL_REGISTRY`. `id`/`defaultAccessModel` are cast to their pinned literal unions. */
export function getCanonicalProcurementChannels(): ReadonlyArray<{
  id: ProcurementChannel;
  name: string;
  description?: string;
  defaultAccessModel: AccessModel;
  isMonopoly: boolean;
}> {
  const { jsonData } = requireCanonicalRow<ProcurementChannelsJson>("procurement_channels");
  return jsonData.options.map((o) => ({
    id: o.id as ProcurementChannel,
    name: o.name,
    description: o.description,
    defaultAccessModel: o.defaultAccessModel as AccessModel,
    isMonopoly: o.isMonopoly,
  }));
}

/** Raw canonical packaging strings — parity-tested against `PACKAGING_OPTIONS`. */
export function getCanonicalPackagingOptions(): readonly string[] {
  return requireCanonicalRow<readonly string[]>("packaging_options").jsonData;
}

/** Raw canonical closure strings — parity-tested against `CLOSURE_OPTIONS`. */
export function getCanonicalClosureOptions(): readonly string[] {
  return requireCanonicalRow<readonly string[]>("closure_options").jsonData;
}

interface ActiveCurrenciesJson {
  readonly codes: readonly string[];
}

/** Raw canonical ISO-4217 codes — parity-tested against `ACTIVE_CURRENCIES`. */
export function getCanonicalActiveCurrencies(): readonly string[] {
  return requireCanonicalRow<ActiveCurrenciesJson>("active_currencies").jsonData.codes;
}

/** Raw canonical enterprise-type ids — backs the derived `ENTERPRISE_TYPE_LABELS` map in `../format.ts`. */
export function getCanonicalEnterpriseTypeIds(): readonly string[] {
  return requireCanonicalRow<readonly string[]>("enterprise_types").jsonData;
}

interface CountryCodesJson {
  readonly description: string;
  readonly codes: ReadonlyArray<{ readonly code: string; readonly name: string }>;
}

/** Full 250-entry ISO-3166-1 code/name pairs — parity-tested against `STATIC_COUNTRY_LABEL_MAP`. */
export function getCanonicalCountryCodes(): ReadonlyArray<{ code: string; name: string }> {
  return requireCanonicalRow<CountryCodesJson>("country_codes").jsonData.codes.map((c) => ({
    code: c.code,
    name: c.name,
  }));
}

interface OperatingMarketsJson {
  readonly description: string;
  readonly codes: ReadonlyArray<{ readonly code: string; readonly name: string }>;
}

/**
 * CellarNode's curated operating-market subset (~40 codes) — the source
 * for `CURATED_COUNTRY_LABEL_OVERRIDES` in `../country.ts`. NOT the full
 * ISO-3166-1 set (that's `getCanonicalCountryCodes`).
 */
export function getCanonicalOperatingMarkets(): ReadonlyArray<{ code: string; name: string }> {
  return requireCanonicalRow<OperatingMarketsJson>("operating_markets").jsonData.codes.map(
    (c) => ({ code: c.code, name: c.name }),
  );
}
