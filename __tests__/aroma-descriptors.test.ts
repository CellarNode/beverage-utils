import { describe, expect, it } from "vitest";
import {
  getAromaDescriptorFamilies,
  getAromaDescriptorFamily,
  getAromaDescriptorLabel,
} from "../src/aroma-descriptors";

describe("getAromaDescriptorFamilies", () => {
  it("ships exactly the three v1 families", () => {
    expect(Object.keys(getAromaDescriptorFamilies()).sort()).toEqual(["beer", "spirits", "wine"]);
  });

  it("is frozen — top level and per-family/per-term", () => {
    const families = getAromaDescriptorFamilies();
    expect(Object.isFrozen(families)).toBe(true);
    const wine = families.wine;
    expect(Object.isFrozen(wine)).toBe(true);
    expect(Object.isFrozen(wine?.terms)).toBe(true);
    expect(Object.isFrozen(wine?.terms[0])).toBe(true);
  });

  it("rejects mutation in strict mode", () => {
    const families = getAromaDescriptorFamilies();
    expect(() => {
      // @ts-expect-error — intentional mutation attempt for the freeze test
      families.wine = { label: "x", standardRef: "x", terms: [] };
    }).toThrow(TypeError);
  });
});

describe("getAromaDescriptorFamily", () => {
  it("returns the wine family with a non-empty WSET-attributed term list", () => {
    const wine = getAromaDescriptorFamily("wine");
    expect(wine).not.toBeNull();
    expect(wine?.standardRef).toBe("WSET-L3-SAT");
    expect(wine?.terms.length).toBeGreaterThan(50);
    const vanilla = wine?.terms.find((t) => t.slug === "vanilla");
    expect(vanilla).toEqual({
      slug: "vanilla",
      label: "Vanilla",
      "x-standard": "WSET-L3-SAT",
      aliases: ["vanillin"],
    });
  });

  it("returns the spirits and beer families too — staged but shipped (CEL-1614)", () => {
    expect(getAromaDescriptorFamily("spirits")?.standardRef).toBe("WSET-L3-Spirits");
    expect(getAromaDescriptorFamily("beer")?.standardRef).toBe("BJCP-2021");
  });

  it("returns null for a category with no lexicon", () => {
    expect(getAromaDescriptorFamily("non_alcoholic")).toBeNull();
    expect(getAromaDescriptorFamily("not-a-real-family")).toBeNull();
  });
});

describe("getAromaDescriptorLabel", () => {
  it("resolves a known slug to its canonical label", () => {
    expect(getAromaDescriptorLabel("wine", "blackcurrant")).toBe("Blackcurrant");
  });

  it("is lenient — returns the input unchanged for a value that isn't a known slug", () => {
    // Unmigrated free text ("cassis" is an alias, not the slug itself) and
    // genuine producer custom entries both fall through unchanged, same
    // contract as the backend's resolveAromaDescriptor `matchType: "custom"`.
    expect(getAromaDescriptorLabel("wine", "cassis")).toBe("cassis");
    expect(getAromaDescriptorLabel("wine", "a very specific house note")).toBe(
      "a very specific house note",
    );
  });

  it("is lenient — returns the input unchanged for an unknown family", () => {
    expect(getAromaDescriptorLabel("non_alcoholic", "anything")).toBe("anything");
  });

  it("round-trips a custom value exactly, including case and whitespace", () => {
    const custom = "  Grandma's Cellar Note  ";
    expect(getAromaDescriptorLabel("wine", custom)).toBe(custom);
  });
});
