import { describe, expect, it } from "vitest";
import type { BeverageClassification } from "../src/types";
import {
  getBeverageCategoryEntry,
  getBeverageSubtypeEntry,
  isBeverageCategoryId,
  isBeverageSubtypeId,
  normalizeAndCheckBeverageCategoryId,
  normalizeAndCheckBeverageSubtypeId,
} from "../src/classifications";

const TREE: BeverageClassification = {
  categories: [
    {
      id: "wine",
      name: "Still Wine",
      hsHeading: "2204",
      subtypes: [
        { id: "red", name: "Red Wine", oivType: "1" },
        { id: "white", name: "White Wine", oivType: "2" },
      ],
    },
    {
      id: "sparkling_wine",
      name: "Sparkling Wine",
      hsHeading: "2204",
      subtypes: [{ id: "red", name: "Red Sparkling" }],
    },
  ],
};

describe("isBeverageCategoryId", () => {
  it("accepts an exact known category id", () => {
    expect(isBeverageCategoryId("wine", TREE)).toBe(true);
  });

  it("rejects an unknown category id", () => {
    expect(isBeverageCategoryId("beer", TREE)).toBe(false);
  });

  it("is strict — no case normalisation", () => {
    expect(isBeverageCategoryId("Wine", TREE)).toBe(false);
  });

  it("rejects non-string input", () => {
    expect(isBeverageCategoryId(null, TREE)).toBe(false);
    expect(isBeverageCategoryId(undefined, TREE)).toBe(false);
    expect(isBeverageCategoryId(42, TREE)).toBe(false);
  });

  it("defaults to the canonical taxonomy when no tree is passed", () => {
    expect(isBeverageCategoryId("wine")).toBe(true);
    expect(isBeverageCategoryId("not-a-real-category")).toBe(false);
  });
});

describe("isBeverageSubtypeId", () => {
  it("accepts a subtype under its owning category", () => {
    expect(isBeverageSubtypeId("wine", "red", TREE)).toBe(true);
  });

  it("rejects the same subtype id under a category that reuses it correctly", () => {
    expect(isBeverageSubtypeId("sparkling_wine", "red", TREE)).toBe(true);
  });

  it("rejects a subtype id that only exists under a different category", () => {
    expect(isBeverageSubtypeId("sparkling_wine", "white", TREE)).toBe(false);
  });

  it("rejects an unknown category", () => {
    expect(isBeverageSubtypeId("beer", "red", TREE)).toBe(false);
  });
});

describe("normalizeAndCheckBeverageCategoryId", () => {
  it("trims and lowercases before matching, returns canonical casing", () => {
    expect(normalizeAndCheckBeverageCategoryId("  WINE  ", TREE)).toBe("wine");
  });

  it("returns null for an unknown category", () => {
    expect(normalizeAndCheckBeverageCategoryId("beer", TREE)).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(normalizeAndCheckBeverageCategoryId("   ", TREE)).toBeNull();
  });
});

describe("normalizeAndCheckBeverageSubtypeId", () => {
  it("resolves a padded/mixed-case pair to canonical ids", () => {
    expect(normalizeAndCheckBeverageSubtypeId(" Wine ", " RED ", TREE)).toBe("red");
  });

  it("returns null when the subtype belongs to a different category", () => {
    expect(normalizeAndCheckBeverageSubtypeId("sparkling_wine", "white", TREE)).toBeNull();
  });

  it("returns null for an unknown category", () => {
    expect(normalizeAndCheckBeverageSubtypeId("beer", "red", TREE)).toBeNull();
  });
});

describe("getBeverageCategoryEntry", () => {
  it("returns the full entry for a known id", () => {
    expect(getBeverageCategoryEntry("wine", TREE)).toEqual(TREE.categories[0]);
  });

  it("falls back to a case-insensitive match", () => {
    expect(getBeverageCategoryEntry("WINE", TREE)?.id).toBe("wine");
  });

  it("returns null for an unknown id", () => {
    expect(getBeverageCategoryEntry("beer", TREE)).toBeNull();
  });

  it("returns null for nullish input without throwing", () => {
    expect(getBeverageCategoryEntry(null, TREE)).toBeNull();
    expect(getBeverageCategoryEntry(undefined, TREE)).toBeNull();
  });
});

describe("getBeverageSubtypeEntry", () => {
  it("returns the full entry scoped to its owning category", () => {
    expect(getBeverageSubtypeEntry("wine", "red", TREE)).toEqual(TREE.categories[0].subtypes[0]);
    expect(getBeverageSubtypeEntry("sparkling_wine", "red", TREE)).toEqual(
      TREE.categories[1].subtypes[0],
    );
  });

  it("returns null for the orphan shape — valid subtype, wrong category", () => {
    expect(getBeverageSubtypeEntry("sparkling_wine", "white", TREE)).toBeNull();
  });

  it("returns null when the category itself is unknown", () => {
    expect(getBeverageSubtypeEntry("beer", "red", TREE)).toBeNull();
  });
});
