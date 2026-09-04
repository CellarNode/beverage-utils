# Canonical reference-data sync log

Vendored copy of `apps/cellarnode/src/db/canonical/reference-data.ts` from `cellarnode-backend-v2`
(CEL-1604 D13/D27). Regenerate with `pnpm sync-canonical`; never hand-edit
`reference-data.json`.

- **Last synced:** 2026-09-04T09:23:20.076Z
- **Source repo:** `CellarNode/cellarnode-backend-v2`
- **Source commit:** `38d19bcb110a169481bd91c060feb4e8f362d775`
- **Backend generator:** `apps/cellarnode/src/db/canonical/generate-reference-data-json.ts`
- **Backend source file:** `apps/cellarnode/src/db/canonical/reference-data.ts`
- **Schema version:** 1
- **Entry count:** 18
- **Row ids:** `access_models` (v1), `active_currencies` (v2), `aroma_descriptors` (v1), `beverage_classifications` (v1), `beverage_type_schemas` (v2), `chemical_analysis_schemas` (v1), `closure_options` (v1), `country_codes` (v2), `dedup_config` (v1), `elabel_compliance_requirements` (v1), `enterprise_types` (v2), `fic_label_schemas` (v2), `operating_markets` (v1), `packaging_options` (v1), `price_recommendation_config` (v3), `price_types` (v3), `procurement_channels` (v2), `subtype_aliases` (v1)

Run `pnpm test` after every sync — `__tests__/canonical-parity.test.ts`
fails loudly if any shipped static in this package has drifted from the rows
vendored here.
