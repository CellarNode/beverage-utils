# Changelog

## 0.8.0 (2026-07-17)

Add the category-aware subtype-only formatter (CEL-1069).

- **New `formatBeverageSubtype(categoryId, subtypeId?, map?)`** — resolves a
  subtype ID to its display label via composite `${categoryId}:${subtypeId}`
  lookup, falling back to the flat subtype key then a humanized slug; nullish
  subtype returns `""`. The shared primitive dashboards use to render
  category-aware subtype labels (`red` under wine vs sparkling_wine) instead of
  raw IDs, replacing inline composite-key reimplementations in consumers.
- **`formatBeverageType` refactored to reuse `formatBeverageSubtype`** so pair
  and subtype-only formatting can never drift. No behaviour change — existing
  tests unchanged; suite 221 → 228.

Additive, backward-compatible. Minor bump.

## 0.7.0 (2026-05-29)

Harden the canonical static exports (CEL-406). Follow-up to the CEL-348 move —
deferred out of that PR to keep its "1:1 code move, no behaviour changes"
contract intact.

- **`Object.freeze` on every `STATIC_*_REGISTRY` / `STATIC_*_FALLBACK`** across
  all six canonical concerns (currency, country, packaging, closure,
  procurement channels, access models) — top-level array **and** per-entry
  objects for the object-bearing registries. The `readonly` types only guarded
  TS-level mutation; the runtime arrays/objects were mutable, so a consumer
  could corrupt a shared canonical singleton. They now throw in strict mode.
  (The `STATIC_*_LABEL_MAP` exports were already frozen.)
- **`buildCountryLabelMap` now trims the name + falls back to the canonical
  code** when it's blank/whitespace-only (`out[upper] = entry.name.trim() ||
  upper`), matching the trim+fallback the other five `build*LabelMap` helpers
  already do. Prevents a malformed runtime row from writing an empty label.
- New `__tests__/freeze-hardening.test.ts` (37 tests): every frozen export
  rejects `push()` / entry mutation in strict mode, plus the blank-name
  fallback. Suite: 184 → 221, no regressions.

No API surface change; behaviour change is limited to the blank-name fallback
above. Minor bump because freezing could surface a latent consumer bug that
was relying on mutating a shared canonical array.

## 0.6.0 (2026-05-21)

Promote the canonical primitives from `@cellarnode/ui/src/lib/*` (CEL-348 / CEL-336).
All six concerns landed in a single PR — zero-dep TypeScript only. Hooks and React
components stay in `@cellarnode/ui`; this slice carries only tuples, typed unions,
formatters, predicates (strict + lenient), label-map builders, registry-entry types,
and static fallbacks.

A follow-up PR will publish `@cellarnode/ui@0.70.0` to hard-remove the duplicates
and re-export them from `@cellarnode/beverage-utils` to preserve backward compat.

### Currency (CEL-341)

- `ACTIVE_CURRENCIES`, `Currency`, `CurrencyRegistryEntry`
- `STATIC_CURRENCY_FALLBACK`, `STATIC_CURRENCY_REGISTRY`, `STATIC_CURRENCY_LABEL_MAP`
- `formatCurrencyLabel`, `buildCurrencyLabelMap`
- `isCurrency`, `normalizeAndCheckCurrency`

### Country (CEL-338)

- `COUNTRY_CODES`, `CountryCode`, `CountryRegistryEntry`
- `STATIC_COUNTRY_FALLBACK`, `STATIC_COUNTRY_LABEL_MAP`
- `formatCountryLabel`, `buildCountryLabelMap`
- `isCountryCode`, `normalizeAndCheckCountryCode`

### Packaging (CEL-340)

- `PACKAGING_OPTIONS`, `Packaging`, `PackagingRegistryEntry`
- `STATIC_PACKAGING_FALLBACK`, `STATIC_PACKAGING_REGISTRY`, `STATIC_PACKAGING_LABEL_MAP`
- `formatPackagingLabel`, `buildPackagingLabelMap`
- `isPackaging`, `normalizeAndCheckPackaging`

### Closure (CEL-340)

- `CLOSURE_OPTIONS`, `Closure`, `ClosureRegistryEntry`
- `STATIC_CLOSURE_FALLBACK`, `STATIC_CLOSURE_REGISTRY`, `STATIC_CLOSURE_LABEL_MAP`
- `formatClosureLabel`, `buildClosureLabelMap`
- `isClosure`, `normalizeAndCheckClosure`

### Access models (CEL-343)

- `ACCESS_MODELS`, `AccessModel`, `AccessModelRegistryEntry`
- `STATIC_ACCESS_MODEL_FALLBACK`, `STATIC_ACCESS_MODEL_REGISTRY`,
  `STATIC_ACCESS_MODEL_LABEL_MAP`
- `formatAccessModelLabel`, `buildAccessModelLabelMap`
- `isAccessModel`, `normalizeAndCheckAccessModel`, `getAccessModelEntry`

### Procurement channels (CEL-343)

- `PROCUREMENT_CHANNELS`, `ProcurementChannel`, `ProcurementChannelRegistryEntry`
- `STATIC_PROCUREMENT_CHANNEL_FALLBACK`, `STATIC_PROCUREMENT_CHANNEL_REGISTRY`,
  `STATIC_PROCUREMENT_CHANNEL_LABEL_MAP`
- `formatProcurementChannelLabel`, `buildProcurementChannelLabelMap`
- `isProcurementChannel`, `normalizeAndCheckProcurementChannel`,
  `getProcurementChannelEntry`

### Notes

- `EnterpriseType` + `formatEnterpriseTypeLabel` already live in beverage-utils
  from CEL-337 — no changes there.
- Price types (`PRICE_TYPES`, `PriceType`) only live in `@cellarnode/ui` as a
  React hook (`usePriceTypes`) and a component-bound `PriceTypeRegistryEntry`
  type — no primitive surface exists to move yet.
- `BASIS` / `Basis` live in `@cellarnode/finance` per the existing finance package
  ownership (not duplicated in `@cellarnode/ui`).

## 0.3.1 (2026-03-14)

- Fix repository URL casing for npm provenance verification

## 0.3.0 (2026-03-14)

- Add Vue composable (`useBeverageLabelMap`) via `@cellarnode/beverage-utils/vue`
- Add Angular inject function (`injectBeverageLabelMap`) via `@cellarnode/beverage-utils/angular`
- Switch to public npm registry (drop GitHub Packages)
- Add GitHub Actions CI workflow (typecheck, test, build, publint)
- Add auto-publish workflow (publishes to npm on push to main when version changes)
- Modernize tsconfig (NodeNext, declarationMap, verbatimModuleSyntax, sourceMap)
- Add `.js` extensions to all relative imports for strict ESM compliance
- Add `sideEffects: false` for better tree-shaking
- Ship compiled JS + declarations in `dist/` (fixes Turbopack "Missing module type" error)

## 0.2.0 (2026-03-14)

- Add build step (`tsc`) and ship compiled JS for Turbopack/Next.js compatibility
- Exports now point to `dist/` instead of raw `src/` TypeScript files
- Add `prepublishOnly` script to ensure build runs before every publish
- Add `publint` and `@arethetypeswrong/cli` validation via `check-exports` script

## 0.1.1 (2026-03-14)

- Switch from GitHub Packages to git-based installs
- Replace `prepublishOnly` with `prepare` script for git dependency builds

## 0.1.0 (2026-03-13)

- Initial release
- `buildLabelMap()` -- composite-key label map builder
- `formatBeverageLabel()` -- slug-to-label formatter with null safety
- `formatBeverageType()` -- category/subtype display formatter with disambiguation
- `useBeverageLabelMap()` -- React hook (TanStack Query)
