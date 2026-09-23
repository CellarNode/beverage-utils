import { describe, it, expect } from "vitest";
import {
  PACKAGING_OPTIONS,
  PACKAGING_ATTRIBUTES,
  STATIC_PACKAGING_FALLBACK,
  STATIC_PACKAGING_LABEL_MAP,
  STATIC_PACKAGING_REGISTRY,
  buildPackagingLabelMap,
  formatPackagingLabel,
  isPackaging,
  normalizeAndCheckPackaging,
  normalizeTenderPackagingTerm,
} from "../src/packaging";

describe("PACKAGING_OPTIONS tuple", () => {
  it("matches the nine canonical backend options while preserving the first five IDs", () => {
    // Mirrors `cellarnode-backend-v2/src/db/canonical/reference-data.ts`
    // `dataId: "packaging_options"`. Adjust both in lockstep when the
    // backend canonical row grows.
    expect(PACKAGING_OPTIONS.length).toBe(9);
    expect([...PACKAGING_OPTIONS]).toEqual([
      "PET",
      "BiB (Bag-in-Box)",
      "Glass",
      "Aluminum",
      "Light-weight glass bottle",
      "Cardboard packaging",
      "Cardboard bottle",
      "Pouch",
      "Returnable glass bottle",
    ]);
  });

  it("has unique entries", () => {
    expect(new Set(PACKAGING_OPTIONS).size).toBe(PACKAGING_OPTIONS.length);
  });
});

describe("PACKAGING_ATTRIBUTES", () => {
  it("covers every canonical option without assuming unstated form or returnability", () => {
    expect(Object.keys(PACKAGING_ATTRIBUTES)).toEqual([...PACKAGING_OPTIONS]);
    expect(PACKAGING_ATTRIBUTES["Cardboard packaging"]).toEqual({
      material: "cardboard",
      form: null,
      returnability: "unspecified",
    });
    expect(PACKAGING_ATTRIBUTES["Cardboard bottle"].form).toBe("bottle");
    expect(PACKAGING_ATTRIBUTES.Glass.returnability).toBe("unspecified");
    expect(PACKAGING_ATTRIBUTES["Returnable glass bottle"]).toEqual({
      material: "glass",
      form: "bottle",
      returnability: "returnable",
    });
    expect(PACKAGING_ATTRIBUTES.Pouch.material).toBeNull();
    expect(PACKAGING_ATTRIBUTES.Aluminum.form).toBeNull();
  });

  it("is frozen so consumers cannot mutate the shared vocabulary", () => {
    expect(Object.isFrozen(PACKAGING_ATTRIBUTES)).toBe(true);
    for (const attributes of Object.values(PACKAGING_ATTRIBUTES)) {
      expect(Object.isFrozen(attributes)).toBe(true);
    }
  });
});

describe("STATIC_PACKAGING_FALLBACK + REGISTRY + LABEL_MAP", () => {
  it("mirrors the tuple", () => {
    expect([...STATIC_PACKAGING_FALLBACK]).toEqual([...PACKAGING_OPTIONS]);
  });

  it("derives the registry as identity { value, label }", () => {
    expect(STATIC_PACKAGING_REGISTRY.map((r) => r.value)).toEqual([
      ...PACKAGING_OPTIONS,
    ]);
    for (const row of STATIC_PACKAGING_REGISTRY) {
      expect(row.label).toBe(row.value);
    }
  });

  it("derives the label map keyed by canonical strings", () => {
    expect(STATIC_PACKAGING_LABEL_MAP.PET).toBe("PET");
    expect(STATIC_PACKAGING_LABEL_MAP["BiB (Bag-in-Box)"]).toBe(
      "BiB (Bag-in-Box)",
    );
  });
});

describe("formatPackagingLabel", () => {
  it("returns empty string for null / undefined / empty / whitespace", () => {
    expect(formatPackagingLabel(null)).toBe("");
    expect(formatPackagingLabel(undefined)).toBe("");
    expect(formatPackagingLabel("")).toBe("");
    expect(formatPackagingLabel("   ")).toBe("");
  });

  it("returns the canonical label for a known canonical-cased value", () => {
    expect(formatPackagingLabel("PET")).toBe("PET");
    expect(formatPackagingLabel("BiB (Bag-in-Box)")).toBe("BiB (Bag-in-Box)");
    expect(formatPackagingLabel("Light-weight glass bottle")).toBe(
      "Light-weight glass bottle",
    );
    expect(formatPackagingLabel("Returnable glass bottle")).toBe(
      "Returnable glass bottle",
    );
  });

  it("matches case-insensitively when canonical casing differs", () => {
    // "pet" upstream should resolve to "PET"; "glass" → "Glass".
    expect(formatPackagingLabel("pet")).toBe("PET");
    expect(formatPackagingLabel("glass")).toBe("Glass");
    expect(formatPackagingLabel("bib (bag-in-box)")).toBe("BiB (Bag-in-Box)");
  });

  it("echoes the input back for an unknown value", () => {
    // Free-text "Other" values should flow through the formatter
    // unchanged so producer custom labels render as-is in tables.
    expect(formatPackagingLabel("Cardboard")).toBe("Cardboard");
    expect(formatPackagingLabel("Tetra Pak")).toBe("Tetra Pak");
  });

  it("returns empty for non-string types", () => {
    expect(formatPackagingLabel(123 as unknown as string)).toBe("");
  });

  it("uses a consumer-supplied label map when provided", () => {
    const customMap = { PET: "PET (recycled)", Glass: "Glass (heavy)" };
    expect(formatPackagingLabel("PET", customMap)).toBe("PET (recycled)");
    expect(formatPackagingLabel("Glass", customMap)).toBe("Glass (heavy)");
    // Unknown in custom map → echo
    expect(formatPackagingLabel("Aluminum", customMap)).toBe("Aluminum");
  });
});

describe("buildPackagingLabelMap", () => {
  it("returns the static fallback for null / empty input", () => {
    expect(buildPackagingLabelMap(null)).toBe(STATIC_PACKAGING_LABEL_MAP);
    expect(buildPackagingLabelMap(undefined)).toBe(STATIC_PACKAGING_LABEL_MAP);
    expect(buildPackagingLabelMap([])).toBe(STATIC_PACKAGING_LABEL_MAP);
  });

  it("accepts plain string arrays", () => {
    const map = buildPackagingLabelMap(["PET", "Glass"]);
    expect(map.PET).toBe("PET");
    expect(map.Glass).toBe("Glass");
  });

  it("accepts { value, label } entries", () => {
    const map = buildPackagingLabelMap([
      { value: "PET", label: "PET (recycled)" },
      { value: "Glass" },
    ]);
    expect(map.PET).toBe("PET (recycled)");
    expect(map.Glass).toBe("Glass"); // missing label → value identity
  });

  it("skips malformed rows", () => {
    const map = buildPackagingLabelMap([
      { value: "PET", label: "PET" },
      { value: "", label: "Empty" },
      // @ts-expect-error — intentionally malformed
      { value: 42, label: "Number" },
      // @ts-expect-error — intentionally malformed
      null,
    ]);
    expect(Object.keys(map)).toEqual(["PET"]);
  });

  it("falls back to the static label map when every row is malformed", () => {
    const map = buildPackagingLabelMap([
      { value: "", label: "Empty" },
      // @ts-expect-error — intentionally malformed
      { value: 42, label: "Number" },
    ]);
    expect(map).toBe(STATIC_PACKAGING_LABEL_MAP);
  });
});

describe("isPackaging", () => {
  it("returns true for exact canonical values", () => {
    expect(isPackaging("PET")).toBe(true);
    expect(isPackaging("BiB (Bag-in-Box)")).toBe(true);
    expect(isPackaging("Light-weight glass bottle")).toBe(true);
    expect(isPackaging("Cardboard bottle")).toBe(true);
    expect(isPackaging("Pouch")).toBe(true);
  });

  it("returns false for non-canonical-case input (no normalization)", () => {
    // A type predicate that returned true for "pet" would lie. Strict
    // membership is the only honest signature for `value is Packaging`.
    expect(isPackaging("pet")).toBe(false);
    expect(isPackaging("glass")).toBe(false);
    expect(isPackaging(" Glass ")).toBe(false);
  });

  it("returns false for non-canonical values", () => {
    expect(isPackaging("Cardboard")).toBe(false);
    expect(isPackaging("Tetra Pak")).toBe(false);
  });

  it("returns false for non-string input", () => {
    expect(isPackaging(123)).toBe(false);
    expect(isPackaging(null)).toBe(false);
    expect(isPackaging(undefined)).toBe(false);
  });
});

describe("normalizeAndCheckPackaging", () => {
  it("returns the canonical value for exact input", () => {
    expect(normalizeAndCheckPackaging("PET")).toBe("PET");
    expect(normalizeAndCheckPackaging("Glass")).toBe("Glass");
    expect(normalizeAndCheckPackaging("Cardboard packaging")).toBe("Cardboard packaging");
  });

  it("normalises case + whitespace and returns the canonical value", () => {
    expect(normalizeAndCheckPackaging("pet")).toBe("PET");
    expect(normalizeAndCheckPackaging(" glass ")).toBe("Glass");
    expect(normalizeAndCheckPackaging("bib (bag-in-box)")).toBe(
      "BiB (Bag-in-Box)",
    );
    expect(normalizeAndCheckPackaging("LIGHT-WEIGHT GLASS BOTTLE")).toBe(
      "Light-weight glass bottle",
    );
  });

  it("returns null for values outside the registry", () => {
    expect(normalizeAndCheckPackaging("Cardboard")).toBeNull();
    expect(normalizeAndCheckPackaging("Tetra Pak")).toBeNull();
    expect(normalizeAndCheckPackaging("")).toBeNull();
    expect(normalizeAndCheckPackaging("   ")).toBeNull();
  });
});

describe("normalizeTenderPackagingTerm", () => {
  // Source: user-provided `tenders-June-2027-English-Readable.pdf`,
  // Systembolaget June 2027 launch tender, pp 2, 19, 38, and 51.
  it("maps single package terms from the June 2027 launch tender PDF", () => {
    expect(normalizeTenderPackagingTerm("cardboard packaging in bottle format")).toBe("Cardboard bottle"); // p2
    expect(normalizeTenderPackagingTerm("Cardboard packaging")).toBe("Cardboard packaging"); // p19
    expect(normalizeTenderPackagingTerm("Pouch")).toBe("Pouch"); // p38
    expect(normalizeTenderPackagingTerm("Return glass")).toBe("Returnable glass bottle"); // p51 heading
  });

  it("does not collapse ambiguous material or alternative clauses to one option", () => {
    expect(normalizeTenderPackagingTerm("Cardboard")).toBeNull();
    expect(normalizeTenderPackagingTerm("Lightweight bottle max 420 g or PET bottle")).toBeNull(); // p18
    expect(normalizeTenderPackagingTerm("Glass bottle or PET bottle")).toBeNull();
    expect(normalizeTenderPackagingTerm("Returnable pouch")).toBeNull();
    expect(normalizeTenderPackagingTerm("__proto__")).toBeNull();
  });
});
