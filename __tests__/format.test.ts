import { describe, test, expect } from "vitest";
import {
  buildEnterpriseTypeLabelMap,
  formatBeverageLabel,
  formatBeverageType,
  formatEnterpriseTypeLabel,
} from "../src/format";
import { buildLabelMap } from "../src/label-map";
import type { EnterpriseType } from "../src/types";

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

  test("returns empty string for null/undefined", () => {
    expect(formatEnterpriseTypeLabel(null)).toBe("");
    expect(formatEnterpriseTypeLabel(undefined)).toBe("");
  });

  test("returns empty string for empty input", () => {
    expect(formatEnterpriseTypeLabel("")).toBe("");
  });

  test("echoes unknown IDs back unchanged so consumers can detect non-canonical values", () => {
    expect(formatEnterpriseTypeLabel("not_real")).toBe("not_real");
    expect(formatEnterpriseTypeLabel("retailer")).toBe("retailer");
    expect(formatEnterpriseTypeLabel("Producer")).toBe("Producer");
    expect(formatEnterpriseTypeLabel("PRODUCER")).toBe("PRODUCER");
  });
});

describe("EnterpriseType union", () => {
  test("compiles to the canonical lowercase union literal", () => {
    // Type-level assertion: EnterpriseType must equal the documented union.
    type _Check = EnterpriseType extends "producer" | "importer" | "distributor"
      ? "producer" | "importer" | "distributor" extends EnterpriseType
        ? true
        : false
      : false;
    const _ok: _Check = true;
    expect(_ok).toBe(true);

    // Value-level sanity: each canonical literal is assignable.
    const producer: EnterpriseType = "producer";
    const importer: EnterpriseType = "importer";
    const distributor: EnterpriseType = "distributor";
    expect([producer, importer, distributor]).toEqual([
      "producer",
      "importer",
      "distributor",
    ]);
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
