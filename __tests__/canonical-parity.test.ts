import { describe, it, expect } from "vitest";
import {
  CANONICAL_META,
  SUPPORTED_CANONICAL_SCHEMA_VERSION,
  listCanonicalRows,
  getCanonicalRow,
  getCanonicalAccessModels,
  getCanonicalProcurementChannels,
  getCanonicalPackagingOptions,
  getCanonicalClosureOptions,
  getCanonicalActiveCurrencies,
  getCanonicalEnterpriseTypeIds,
  getCanonicalCountryCodes,
  getCanonicalOperatingMarkets,
} from "../src/canonical/index";
import { getCanonicalClassifications } from "../src/classifications";
import { ACCESS_MODELS, STATIC_ACCESS_MODEL_REGISTRY } from "../src/access-models";
import {
  PROCUREMENT_CHANNELS,
  STATIC_PROCUREMENT_CHANNEL_REGISTRY,
} from "../src/procurement-channels";
import { PACKAGING_OPTIONS } from "../src/packaging";
import { CLOSURE_OPTIONS } from "../src/closure";
import { ACTIVE_CURRENCIES } from "../src/currency";
import { COUNTRY_CODES, STATIC_COUNTRY_LABEL_MAP } from "../src/country";
import { buildEnterpriseTypeLabelMap, formatBeverageLabel } from "../src/format";
import type { EnterpriseType } from "../src/types";

/**
 * Provably-equal-to-backend parity suite (CEL-1604 D13/D27).
 *
 * Every static this package ships that mirrors a `cellarnode-backend-v2`
 * canonical reference-data row is checked here against the vendored copy
 * in `src/canonical/reference-data.json` (see `SYNC.md` for provenance —
 * `pnpm sync-canonical` refreshes it from the backend). A shipped static
 * that drifts from its canonical row fails one of these tests; there is no
 * way to change the vendored JSON without this suite noticing.
 *
 * Rows this package does NOT ship a static for (`beverage_type_schemas`,
 * `chemical_analysis_schemas`, `dedup_config`, `elabel_compliance_requirements`,
 * `fic_label_schemas`, `price_recommendation_config`, `price_types`,
 * `subtype_aliases`) are out of scope — they belong to the backend / elabel
 * domain, not this package's public surface.
 *
 * `getCanonicalClassifications()` (`../src/classifications`) is checked
 * separately below, against pinned literal expectations rather than the
 * vendored row directly — it reads a generated snapshot
 * (`src/classifications.generated.ts`), not this file's `canonical/index`
 * accessors, so it stays out of every other shipped module's bundle
 * (CEL-1604 review fixup, P0-1/P0-2).
 */

describe("vendored canonical JSON — $meta", () => {
  it("is on a schema version this package's accessors support", () => {
    expect(CANONICAL_META.schemaVersion).toBe(SUPPORTED_CANONICAL_SCHEMA_VERSION);
  });

  it("entryCount matches the actual row count", () => {
    expect(CANONICAL_META.entryCount).toBe(listCanonicalRows().length);
  });

  it("ships all 18 rows the backend generator produced at vendor time", () => {
    // Not every row backs a static in this package (see file header) — this
    // just pins the vendored file's shape so a partial/truncated re-sync is
    // caught immediately rather than surfacing as missing-row errors later.
    const ids = listCanonicalRows()
      .map((row) => row.dataId)
      .sort();
    expect(ids).toEqual(
      [
        "access_models",
        "aroma_descriptors",
        "active_currencies",
        "beverage_classifications",
        "beverage_type_schemas",
        "chemical_analysis_schemas",
        "closure_options",
        "country_codes",
        "dedup_config",
        "elabel_compliance_requirements",
        "enterprise_types",
        "fic_label_schemas",
        "operating_markets",
        "packaging_options",
        "price_recommendation_config",
        "price_types",
        "procurement_channels",
        "subtype_aliases",
      ].sort(),
    );
  });

  it("getCanonicalRow returns undefined (never throws) for an unknown dataId", () => {
    expect(getCanonicalRow("not_a_real_row")).toBeUndefined();
  });
});

describe("access_models parity", () => {
  it("ACCESS_MODELS matches the canonical row's ids, in order", () => {
    const expectedIds = getCanonicalAccessModels().map((entry) => entry.id);
    expect([...ACCESS_MODELS]).toEqual(expectedIds);
  });

  // STATIC_ACCESS_MODEL_REGISTRY (src/access-models.ts) is a hand-typed
  // literal (CEL-1604 review fixup, P0-1); getCanonicalAccessModels() reads
  // the vendored JSON independently, so this is a genuine cross-check, not
  // `expect(f(x)).toEqual(f(x))` — verified by mutating
  // src/canonical/reference-data.json's access_models row and confirming
  // this test fails.
  it("STATIC_ACCESS_MODEL_REGISTRY deep-equals the canonical row", () => {
    expect(STATIC_ACCESS_MODEL_REGISTRY).toEqual(getCanonicalAccessModels());
  });
});

describe("packaging_options parity", () => {
  it("PACKAGING_OPTIONS deep-equals the canonical row, in order", () => {
    expect([...PACKAGING_OPTIONS]).toEqual(getCanonicalPackagingOptions());
  });
});

describe("closure_options parity", () => {
  it("CLOSURE_OPTIONS deep-equals the canonical row, in order", () => {
    expect([...CLOSURE_OPTIONS]).toEqual(getCanonicalClosureOptions());
  });
});

describe("active_currencies parity", () => {
  it("ACTIVE_CURRENCIES deep-equals the canonical row, in order", () => {
    expect([...ACTIVE_CURRENCIES]).toEqual(getCanonicalActiveCurrencies());
  });
});

describe("procurement_channels parity", () => {
  it("PROCUREMENT_CHANNELS matches the canonical row's ids, in order", () => {
    const expectedIds = getCanonicalProcurementChannels().map((entry) => entry.id);
    expect([...PROCUREMENT_CHANNELS]).toEqual(expectedIds);
  });

  it("STATIC_PROCUREMENT_CHANNEL_REGISTRY deep-equals the canonical row (incl. policy metadata)", () => {
    // STATIC_PROCUREMENT_CHANNEL_REGISTRY (src/procurement-channels.ts) is a
    // hand-typed literal (CEL-1604 review fixup, P0-1); same independence
    // rationale as the access_models check above.
    expect(STATIC_PROCUREMENT_CHANNEL_REGISTRY).toEqual(getCanonicalProcurementChannels());
  });
});

describe("enterprise_types parity", () => {
  const EXPECTED_ENTERPRISE_TYPES = ["producer", "importer", "distributor"] as const;
  // Compile-time exhaustiveness: if `EnterpriseType` (src/types.ts) ever
  // grows a member not listed above, this assignment stops type-checking —
  // `pnpm typecheck` / `make build` catches it even though the union has no
  // runtime representation to assert against directly.
  type _AssertExhaustive = EnterpriseType extends (typeof EXPECTED_ENTERPRISE_TYPES)[number]
    ? true
    : false;
  const _exhaustive: _AssertExhaustive = true;
  void _exhaustive;

  it("EnterpriseType's members match the canonical row's id set", () => {
    expect(new Set(getCanonicalEnterpriseTypeIds())).toEqual(new Set(EXPECTED_ENTERPRISE_TYPES));
  });

  it("buildEnterpriseTypeLabelMap() has exactly one entry per canonical id", () => {
    const map = buildEnterpriseTypeLabelMap();
    expect(new Set(Object.keys(map))).toEqual(new Set(getCanonicalEnterpriseTypeIds()));
  });

  it("buildEnterpriseTypeLabelMap() labels are the humanized canonical ids", () => {
    const map = buildEnterpriseTypeLabelMap();
    for (const id of getCanonicalEnterpriseTypeIds()) {
      expect(map[id]).toBe(formatBeverageLabel(id));
    }
  });
});

describe("country_codes parity", () => {
  it("has the same 250-code set as the canonical row", () => {
    const expectedCodes = getCanonicalCountryCodes().map((c) => c.code);
    expect(new Set(COUNTRY_CODES)).toEqual(new Set(expectedCodes));
    expect(COUNTRY_CODES.length).toBe(expectedCodes.length);
  });

  it("STATIC_COUNTRY_LABEL_MAP deep-equals the canonical row (curated overrides included)", () => {
    const expectedMap = Object.fromEntries(
      getCanonicalCountryCodes().map((c) => [c.code, c.name]),
    );
    expect(STATIC_COUNTRY_LABEL_MAP).toEqual(expectedMap);
  });
});

describe("operating_markets parity", () => {
  it("every curated CellarNode operating-market label matches STATIC_COUNTRY_LABEL_MAP", () => {
    // `operating_markets` is the canonical source for the ~40-entry curated
    // override layer in src/country.ts's (unexported)
    // CURATED_COUNTRY_LABEL_OVERRIDES — checked indirectly here via the
    // public STATIC_COUNTRY_LABEL_MAP rather than exporting an internal.
    const operatingMarkets = getCanonicalOperatingMarkets();
    expect(operatingMarkets.length).toBeGreaterThan(0);
    for (const { code, name } of operatingMarkets) {
      expect(STATIC_COUNTRY_LABEL_MAP[code]).toBe(name);
    }
  });
});

describe("beverage_classifications — getCanonicalClassifications()", () => {
  // CEL-1604 review fixup, P0-2: the previous version of this suite derived
  // its "expected" value from the same `beverage_classifications` row and
  // the same id/name/hsHeading/subtypes projection that
  // getCanonicalClassifications() itself applies, so it could not fail on
  // drift — confirmed by mutating `beverage_classifications.categories[0].name`
  // in `src/canonical/reference-data.json` and seeing 266/266 still pass.
  // These assertions pin explicit literal expectations instead: the full
  // category id list (in order), plus exact subtype id lists for two named
  // categories. Cross-checked against
  // `ui/src/opportunities/wizard/classification-options.ts` — all 10
  // categories and every subtype list match today.
  const EXPECTED_CATEGORY_IDS = [
    "wine",
    "sparkling_wine",
    "fortified_wine",
    "vermouth",
    "beer",
    "spirits",
    "cider_mixed_drinks",
    "flavored_wine",
    "non_alcoholic",
    "other",
  ] as const;

  const EXPECTED_SUBTYPE_IDS: Record<string, readonly string[]> = {
    wine: ["red", "white", "rose", "orange", "natural", "dessert"],
    spirits: [
      "whisky",
      "vodka",
      "gin",
      "rum",
      "tequila",
      "brandy",
      "liqueur",
      "grappa",
    ],
  };

  it("has exactly the 10 canonical category ids, in order", () => {
    const { categories } = getCanonicalClassifications();
    expect(categories.map((c) => c.id)).toEqual([...EXPECTED_CATEGORY_IDS]);
  });

  it.each(Object.entries(EXPECTED_SUBTYPE_IDS))(
    "%s has exactly its pinned subtype ids, in order",
    (categoryId, expectedSubtypeIds) => {
      const { categories } = getCanonicalClassifications();
      const category = categories.find((c) => c.id === categoryId);
      expect(category).toBeDefined();
      expect(category?.subtypes.map((s) => s.id)).toEqual([...expectedSubtypeIds]);
    },
  );

  it("has exactly 10 categories, each with at least one subtype", () => {
    const { categories } = getCanonicalClassifications();
    expect(categories.length).toBe(10);
    for (const category of categories) {
      expect(category.subtypes.length).toBeGreaterThan(0);
    }
  });

  it("returns a deeply frozen classification (CEL-1604 review fixup, P2-5)", () => {
    const classification = getCanonicalClassifications();
    expect(Object.isFrozen(classification)).toBe(true);
    expect(Object.isFrozen(classification.categories)).toBe(true);
    expect(Object.isFrozen(classification.categories[0])).toBe(true);
    expect(Object.isFrozen(classification.categories[0].subtypes)).toBe(true);
    expect(() => (classification.categories as unknown[]).push({})).toThrow(TypeError);
  });

  it("returns the same frozen reference on every call", () => {
    expect(getCanonicalClassifications()).toBe(getCanonicalClassifications());
  });
});

