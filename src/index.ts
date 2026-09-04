export type {
  BeverageSubtype,
  BeverageCategory,
  BeverageClassification,
  EnterpriseType,
} from "./types.js";
export type { LabelMap } from "./label-map.js";
export { buildLabelMap } from "./label-map.js";
export {
  buildEnterpriseTypeLabelMap,
  formatBeverageLabel,
  formatBeverageSubtype,
  formatBeverageType,
  formatEnterpriseTypeLabel,
} from "./format.js";
export {
  normalizeToken,
  normalizeCountryToRegistryCode,
  resolveCountryCode,
  parseVolumeToLiters,
} from "./normalize.js";

// CEL-348 — canonical primitives moved here from `@cellarnode/ui/src/lib/*`.
// React hooks + picker components stay in `@cellarnode/ui` (they depend on
// React + TanStack Query). Primitives are zero-dep TypeScript so every
// backend, worker, agent, mobile target, and dashboard can import them
// without pulling in React.

// Currency (CEL-341).
export {
  ACTIVE_CURRENCIES,
  STATIC_CURRENCY_FALLBACK,
  STATIC_CURRENCY_REGISTRY,
  STATIC_CURRENCY_LABEL_MAP,
  formatCurrencyLabel,
  buildCurrencyLabelMap,
  isCurrency,
  normalizeAndCheckCurrency,
} from "./currency.js";
export type { Currency, CurrencyRegistryEntry } from "./currency.js";

// Country (CEL-338).
export {
  COUNTRY_CODES,
  STATIC_COUNTRY_FALLBACK,
  STATIC_COUNTRY_LABEL_MAP,
  formatCountryLabel,
  buildCountryLabelMap,
  isCountryCode,
  normalizeAndCheckCountryCode,
} from "./country.js";
export type { CountryCode, CountryRegistryEntry } from "./country.js";

// Packaging (CEL-340).
export {
  PACKAGING_OPTIONS,
  STATIC_PACKAGING_FALLBACK,
  STATIC_PACKAGING_REGISTRY,
  STATIC_PACKAGING_LABEL_MAP,
  formatPackagingLabel,
  buildPackagingLabelMap,
  isPackaging,
  normalizeAndCheckPackaging,
} from "./packaging.js";
export type { Packaging, PackagingRegistryEntry } from "./packaging.js";

// Closure (CEL-340).
export {
  CLOSURE_OPTIONS,
  STATIC_CLOSURE_FALLBACK,
  STATIC_CLOSURE_REGISTRY,
  STATIC_CLOSURE_LABEL_MAP,
  formatClosureLabel,
  buildClosureLabelMap,
  isClosure,
  normalizeAndCheckClosure,
} from "./closure.js";
export type { Closure, ClosureRegistryEntry } from "./closure.js";

// Access models (CEL-343).
export {
  ACCESS_MODELS,
  STATIC_ACCESS_MODEL_REGISTRY,
  STATIC_ACCESS_MODEL_FALLBACK,
  STATIC_ACCESS_MODEL_LABEL_MAP,
  formatAccessModelLabel,
  buildAccessModelLabelMap,
  isAccessModel,
  normalizeAndCheckAccessModel,
  getAccessModelEntry,
} from "./access-models.js";
export type {
  AccessModel,
  AccessModelRegistryEntry,
} from "./access-models.js";

// Procurement channels (CEL-343).
export {
  PROCUREMENT_CHANNELS,
  STATIC_PROCUREMENT_CHANNEL_REGISTRY,
  STATIC_PROCUREMENT_CHANNEL_FALLBACK,
  STATIC_PROCUREMENT_CHANNEL_LABEL_MAP,
  formatProcurementChannelLabel,
  buildProcurementChannelLabelMap,
  isProcurementChannel,
  normalizeAndCheckProcurementChannel,
  getProcurementChannelEntry,
} from "./procurement-channels.js";
export type {
  ProcurementChannel,
  ProcurementChannelRegistryEntry,
} from "./procurement-channels.js";

// Canonical beverage classification taxonomy (CEL-1604). Backed by a
// generated literal (`src/classifications.generated.ts`, produced by
// `scripts/generate-classifications.mjs`) rather than the vendored
// `src/canonical/reference-data.json` at runtime — CEL-1604 review fixup,
// P0-1. `src/canonical/index.ts` and the JSON stay internal + test-only
// (see `__tests__/canonical-parity.test.ts`); nothing in this file or any
// other shipped module imports them. `@cellarnode/ui`'s opportunity wizard
// currently hand-copies this taxonomy in
// `ui/src/opportunities/wizard/classification-options.ts` and should read
// it from here instead once it takes this package's release.
//
// CEL-1607 adds the five-function-per-domain shape the other canonical
// vocabularies above already have: `is` / `normalizeAndCheck` / `getEntry`,
// scoped per-category for subtypes since subtype ids repeat across
// categories (`red` under both `wine` and `sparkling_wine`). `format` and
// `build` already shipped as `formatBeverageLabel` / `formatBeverageSubtype`
// / `formatBeverageType` (`./format.js`) and `buildLabelMap` (`./label-map.js`)
// above.
export {
  getCanonicalClassifications,
  getBeverageCategoryEntry,
  getBeverageSubtypeEntry,
  isBeverageCategoryId,
  isBeverageSubtypeId,
  normalizeAndCheckBeverageCategoryId,
  normalizeAndCheckBeverageSubtypeId,
} from "./classifications.js";
