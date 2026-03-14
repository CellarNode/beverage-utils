# Changelog

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
