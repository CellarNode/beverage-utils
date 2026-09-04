# Changelog

## 0.11.0 — 2026-09-04

`getAromaDescriptorFamilies()` / `getAromaDescriptorFamily()` /
`getAromaDescriptorLabel()` (CEL-1618) — a client-side accessor over the
`aroma_descriptors` canonical row vendored in 0.10.0 (CEL-1614/CEL-1604),
consumed by `@cellarnode/ui`'s product-editor sensory tab to render
family-scoped aroma chips (`ui` PR, same ticket).

- **New `src/aroma-descriptors.ts`** + generated
  `src/aroma-descriptors.generated.ts` (via `scripts/generate-aroma-descriptors.mjs`,
  wired into `pnpm sync-canonical` and `pnpm check-aroma-descriptors-fresh`,
  same pattern as `classifications.generated.ts`/CEL-1604 P0-1: the vendored
  157 KB `reference-data.json` never reaches a consumer's bundle).
- Lenient by design, mirroring the backend
  (`cellarnode-backend-v2/apps/cellarnode/src/lib/aroma-descriptor-index.ts`,
  CEL-1614): `getAromaDescriptorLabel(familyId, value)` returns the
  canonical label for a known slug and the input unchanged for anything
  else (unmigrated free text or a genuine producer custom entry) — never
  throws, never drops a value. Does not re-implement the backend's
  fold/alias resolution (`resolveAromaDescriptor`); this package only needs
  slug -> label plus a family's term list for suggestions.
- Ships all three v1 families (`wine`, `spirits`, `beer`) even though only
  `wine`'s sensory fields are `string[]` on the backend today — spirits and
  beer are staged (CEL-1614), so no separate release is needed once those
  fields widen.
- New exports from the package root: `AromaDescriptorTerm`,
  `AromaDescriptorFamily`, `AromaDescriptorFamilies` types plus the three
  functions above.

## 0.10.0 — 2026-09-04

One parameterised `useReferenceData(row, { transport })` hook (CEL-1607,
spec `docs/specs/2026-09-02-matching-canonical-deepening.md` §2 card 09
"Dashboard client", D13). Stacks on the CEL-1604 vendoring change above —
`transport` (base URL + fetch implementation) is now the only thing that
varies between a same-origin admin caller and a cross-origin public caller;
`row` owns the path, response parsing, and static fallback for one
canonical reference-data row. This PR ships the hook + the classification
row it consolidates; the three duplicated fetchers it replaces
(`use-classification-options.ts` in admin-dashboard-v2, `useClassifications.ts`
in producer-dashboard, and this package's own `useBeverageLabelMap`) migrate
in a follow-up PR once this release is out — see the PR description for the
per-consumer migration plan.

- **New `src/react/use-reference-data.ts`** — `useReferenceData(row, { transport })`
  + `referenceDataOptions()` (the underlying `queryOptions()` builder, for
  prefetch/SSR loaders) + the `ReferenceDataRow<T>` / `ReferenceDataTransport`
  / `UseReferenceDataOptions` / `UseReferenceDataResult<T>` types. `data` is
  always a usable value — the row's `fallback` while loading, on a network
  error, on a non-2xx response, or when `row.parse` returns `null` for a
  malformed body — so consumers never branch on `isLoading` just to avoid
  rendering `undefined`.
- **New `src/react/classification-reference-row.ts`** — `CLASSIFICATION_REFERENCE_ROW`
  (the `beverage_classifications` row: admin path
  `/admin/reference-data/beverage_classifications`, public path
  `/api/v1/classifications/beverage-types` — the two surfaces name this row
  differently, which is exactly the divergence `useReferenceData`'s `paths`
  field exists to hide), `parseBeverageClassificationEnvelope()`, and the
  `useBeverageClassifications(options)` convenience wrapper. Falls back to
  `getCanonicalClassifications()` (the generated literal), never the vendored
  `src/canonical/reference-data.json` — importing this module does not reach
  the 157 KB vendored JSON (CEL-1604 review fixup, P0-1; see the PR body's
  bundle-size proof).
- **Classification joins the five-function-per-domain shape** the other
  canonical vocabularies already have (CEL-1607). Format (`formatBeverageLabel`
  / `formatBeverageSubtype` / `formatBeverageType`) and build (`buildLabelMap`)
  already shipped; this adds **is** (`isBeverageCategoryId`,
  `isBeverageSubtypeId`), **normalizeAndCheck** (`normalizeAndCheckBeverageCategoryId`,
  `normalizeAndCheckBeverageSubtypeId`), and **getEntry**
  (`getBeverageCategoryEntry`, `getBeverageSubtypeEntry`) to `src/classifications.ts`,
  all root-exported. Subtype lookups are always category-scoped (subtype ids
  repeat across categories — `red` under both `wine` and `sparkling_wine`),
  and `getBeverageSubtypeEntry` returns `null` for the orphan shape (a valid
  subtype id under the *wrong* category), which is the detection primitive
  CEL-1607 D12's repair-banner work needs.
- Packaging, closure, country, and currency hooks/statics are unchanged —
  out of scope for this ticket.

Vendor the backend canonical reference-data JSON, pinned by a parity test
suite (CEL-1604 D13/D27). Backend half is `cellarnode-backend-v2` PR #608,
which commits a generated `apps/cellarnode/src/db/canonical/reference-data.json`
with a CI staleness check.

- **New `src/canonical/reference-data.json`** — vendored, deterministic copy
  (sorted by `dataId`, re-serialized with a stable indent — not a byte-for-byte
  copy) of the backend's generated canonical rows (17 rows, schema version 1).
  Test-only: nothing shipped imports it (see below). Refresh with
  `pnpm sync-canonical [path-to-backend-json]` (defaults to the sibling
  `../cellarnode-backend-v2` checkout layout; also regenerates
  `src/classifications.generated.ts`). Provenance recorded in
  `src/canonical/SYNC.md` on every sync.
- **New `__tests__/canonical-parity.test.ts` (vitest)**, joining this
  package's existing 10-file test suite — every shipped static that mirrors
  a canonical backend row (`ACCESS_MODELS`, `STATIC_ACCESS_MODEL_REGISTRY`,
  `PACKAGING_OPTIONS`, `CLOSURE_OPTIONS`, `ACTIVE_CURRENCIES`,
  `PROCUREMENT_CHANNELS`, `STATIC_PROCUREMENT_CHANNEL_REGISTRY`,
  `EnterpriseType`, `COUNTRY_CODES` + `STATIC_COUNTRY_LABEL_MAP`) is
  deep-equal-checked against the vendored JSON, so drift between this
  package and the backend fails loudly instead of silently diverging.
- **`STATIC_ACCESS_MODEL_REGISTRY`, `STATIC_PROCUREMENT_CHANNEL_REGISTRY`,
  and the enterprise-type label map stay hand-typed** — same as every other
  literal-union tuple (`ACCESS_MODELS`, `PROCUREMENT_CHANNELS`, etc.), and
  for the same reason where it applies (deriving them from the vendored JSON
  would widen their public type to `string`). The parity suite pins all of
  them against the vendored row instead of deriving any of them at module
  load — an earlier draft derived the three registries above, which pulled
  the 157 KB vendored JSON into every consumer of `formatBeverageLabel`,
  `isAccessModel`, `getProcurementChannelEntry` and friends; reverted before
  merge (review fixup, P0-1).
- **New export: `getCanonicalClassifications()`** (`src/classifications.ts`)
  — the full canonical beverage category → subtype taxonomy (10
  categories). Backed by a generated literal
  (`src/classifications.generated.ts`, produced by
  `scripts/generate-classifications.mjs` from the vendored JSON — same
  pattern as `src/country-codes.generated.ts`), not a runtime JSON read, so
  importing it costs ~2.4 KB minified rather than the full vendored JSON.
  `@cellarnode/ui`'s opportunity wizard currently hand-copies this taxonomy
  in `ui/src/opportunities/wizard/classification-options.ts`; it should read
  from this accessor once it takes this package's next release (follow-up
  PR, not part of this change).

## 0.9.0 (2026-08-04)


Release the registry-gated country normalizer shipped in #7 (CEL-1196). That PR
merged without a version bump, so nothing published — this bump is what actually
releases it.

- **`COUNTRY_CODES` is now the full ISO-3166-1 alpha-2 set (250 codes)**,
  generated from the pinned `i18n-iso-countries` dependency into
  `src/country-codes.generated.ts` via `pnpm generate:country-codes`. It was a
  hand-maintained 40-code tuple, which silently rejected valid origins such as
  Moldova after the backend widened its `country_codes` row. `CountryCode`
  widens with it.
- **New `normalizeCountryToRegistryCode(raw)`** — the single normalization
  implementation. Widens an alpha-2 code, alpha-3 code, or localized en/es/sv
  name, then narrows to `CountryCode`. Ambiguous names resolve to `null` rather
  than guessing: `congo` (CG/CD) and `virgin islands` (VG/VI) collide in the
  dataset and previously returned whichever entry was inserted last.
- **`resolveCountryCode` and `normalizeAndCheckCountryCode` are deprecated
  delegates** over that one implementation. Kept exported for one migration
  cycle so consumers can move at their own pace.
- **`STATIC_COUNTRY_FALLBACK` / `STATIC_COUNTRY_LABEL_MAP` cover the full set.**
  The previous five-entry fallback was itself a silent-shrink mechanism. The 40
  previously curated display names are preserved verbatim via an override map in
  hand-written source, so `formatCountryLabel("US")` stays "United States" and
  `CZ` stays "Czechia"; other codes use their generated ISO name.

Breaking: `CountryCode` grows from 40 to 250 members, so exhaustive
`Record<CountryCode, X>` maps and switches over the old union no longer compile.
Minor bump per 0.x convention, but treat it as a coordinated breaking release —
`@cellarnode/ui` needs the paired change in CellarNode/ui#251.

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
