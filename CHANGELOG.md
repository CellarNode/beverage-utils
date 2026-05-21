# Changelog

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
