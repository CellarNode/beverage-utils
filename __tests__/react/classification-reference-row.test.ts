import { describe, expect, it } from "vitest";
import {
  CLASSIFICATION_REFERENCE_ROW,
  parseBeverageClassificationEnvelope,
} from "../../src/react/classification-reference-row";
import { getCanonicalClassifications } from "../../src/classifications";

describe("parseBeverageClassificationEnvelope", () => {
  it("extracts categories from the admin/public envelope shape", () => {
    const envelope = {
      jsonData: { categories: [{ id: "wine", name: "Still Wine", subtypes: [] }] },
      version: 3,
    };
    expect(parseBeverageClassificationEnvelope(envelope)).toEqual({
      categories: [{ id: "wine", name: "Still Wine", subtypes: [] }],
    });
  });

  it("returns null when jsonData is missing", () => {
    expect(parseBeverageClassificationEnvelope({ version: 1 })).toBeNull();
  });

  it("returns null when categories is missing or not an array", () => {
    expect(parseBeverageClassificationEnvelope({ jsonData: {} })).toBeNull();
    expect(parseBeverageClassificationEnvelope({ jsonData: { categories: "nope" } })).toBeNull();
  });

  it("returns null when a category entry has no string id", () => {
    expect(
      parseBeverageClassificationEnvelope({ jsonData: { categories: [{ name: "Still Wine" }] } }),
    ).toBeNull();
  });

  it("returns null for non-object input", () => {
    expect(parseBeverageClassificationEnvelope(null)).toBeNull();
    expect(parseBeverageClassificationEnvelope("nope")).toBeNull();
    expect(parseBeverageClassificationEnvelope(42)).toBeNull();
  });
});

describe("CLASSIFICATION_REFERENCE_ROW", () => {
  it("carries the admin and public paths CEL-1607 consolidates", () => {
    expect(CLASSIFICATION_REFERENCE_ROW.dataId).toBe("beverage_classifications");
    expect(CLASSIFICATION_REFERENCE_ROW.paths).toEqual({
      admin: "/admin/reference-data/beverage_classifications",
      public: "/api/v1/classifications/beverage-types",
    });
  });

  it("falls back to the generated canonical taxonomy, not the vendored JSON", () => {
    expect(CLASSIFICATION_REFERENCE_ROW.fallback).toEqual(getCanonicalClassifications());
  });
});
