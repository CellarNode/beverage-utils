import { describe, test, expect } from "vitest";
import {
  buildEnterpriseTypeLabelMap,
  formatBeverageLabel,
  formatBeverageType,
  formatEnterpriseTypeLabel,
} from "../src/format";
import { buildLabelMap } from "../src/label-map";

describe("formatBeverageLabel", () => {
  test("returns empty string for null/undefined", () => {
    expect(formatBeverageLabel(null)).toBe("");
    expect(formatBeverageLabel(undefined)).toBe("");
  });

  test("looks up key in map", () => {
    expect(formatBeverageLabel("wine", { wine: "Still Wine" })).toBe("Still Wine");
  });

  test("humanizes snake_case when no map match", () => {
    expect(formatBeverageLabel("sparkling_wine")).toBe("Sparkling Wine");
  });

  test("humanizes single word", () => {
    expect(formatBeverageLabel("beer")).toBe("Beer");
  });
});

describe("formatBeverageType", () => {
  test("returns only category when no subtype", () => {
    expect(formatBeverageType("wine", null, { wine: "Still Wine" })).toBe("Still Wine");
    expect(formatBeverageType("wine", undefined, { wine: "Still Wine" })).toBe("Still Wine");
  });

  test("returns category / subtype", () => {
    const map = { wine: "Still Wine", red: "Red Wine", "wine:red": "Red Wine" };
    expect(formatBeverageType("wine", "red", map)).toBe("Still Wine / Red Wine");
  });

  test("disambiguates subtypes across categories", () => {
    const map = buildLabelMap({
      categories: [
        { id: "wine", name: "Still Wine", subtypes: [{ id: "red", name: "Red Wine" }] },
        { id: "sparkling_wine", name: "Sparkling Wine", subtypes: [{ id: "red", name: "Red Sparkling" }] },
      ],
    });
    expect(formatBeverageType("wine", "red", map)).toBe("Still Wine / Red Wine");
    expect(formatBeverageType("sparkling_wine", "red", map)).toBe("Sparkling Wine / Red Sparkling");
  });

  test("falls back to humanized slug when no map", () => {
    expect(formatBeverageType("sparkling_wine", "red")).toBe("Sparkling Wine / Red");
  });
});

describe("formatEnterpriseTypeLabel", () => {
  test("formats canonical lowercase IDs", () => {
    expect(formatEnterpriseTypeLabel("producer")).toBe("Producer");
    expect(formatEnterpriseTypeLabel("importer")).toBe("Importer");
    expect(formatEnterpriseTypeLabel("distributor")).toBe("Distributor");
  });

  test("returns fallback for null/undefined", () => {
    expect(formatEnterpriseTypeLabel(null)).toBe("Unknown enterprise type");
    expect(formatEnterpriseTypeLabel(undefined)).toBe("Unknown enterprise type");
  });

  test("returns fallback for empty string", () => {
    expect(formatEnterpriseTypeLabel("")).toBe("Unknown enterprise type");
  });

  test("returns fallback for unknown ID", () => {
    expect(formatEnterpriseTypeLabel("retailer")).toBe("Unknown enterprise type");
    expect(formatEnterpriseTypeLabel("Producer")).toBe("Unknown enterprise type");
    expect(formatEnterpriseTypeLabel("PRODUCER")).toBe("Unknown enterprise type");
  });
});

describe("buildEnterpriseTypeLabelMap", () => {
  test("returns all three canonical mappings", () => {
    expect(buildEnterpriseTypeLabelMap()).toEqual({
      producer: "Producer",
      importer: "Importer",
      distributor: "Distributor",
    });
  });

  test("returns a fresh object on each call", () => {
    const a = buildEnterpriseTypeLabelMap();
    const b = buildEnterpriseTypeLabelMap();
    expect(a).not.toBe(b);
    a.producer = "mutated";
    expect(buildEnterpriseTypeLabelMap().producer).toBe("Producer");
  });
});
