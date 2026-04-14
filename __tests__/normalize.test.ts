import { describe, it, expect } from "bun:test";
import { normalizeToken, resolveCountryCode } from "../src/normalize";

describe("normalizeToken", () => {
  it("returns empty string for null/undefined/empty", () => {
    expect(normalizeToken(null)).toBe("");
    expect(normalizeToken(undefined)).toBe("");
    expect(normalizeToken("")).toBe("");
    expect(normalizeToken("   ")).toBe("");
  });

  it("lowercases and trims", () => {
    expect(normalizeToken("  Spain  ")).toBe("spain");
    expect(normalizeToken("BRANDY")).toBe("brandy");
  });

  it("strips diacritics", () => {
    expect(normalizeToken("Côte du Rhône")).toBe("cote-du-rhone");
    expect(normalizeToken("España")).toBe("espana");
    expect(normalizeToken("Jérez")).toBe("jerez");
  });

  it("collapses whitespace and underscores to single hyphens", () => {
    expect(normalizeToken("sparkling   wine")).toBe("sparkling-wine");
    expect(normalizeToken("red_wine")).toBe("red-wine");
    expect(normalizeToken("red wine ")).toBe("red-wine");
  });

  it("collapses multiple hyphens and strips leading/trailing", () => {
    expect(normalizeToken("--foo--bar--")).toBe("foo-bar");
    expect(normalizeToken("a---b")).toBe("a-b");
  });
});

describe("resolveCountryCode", () => {
  it("returns ISO alpha-2 for English names", () => {
    expect(resolveCountryCode("Spain")).toBe("ES");
    expect(resolveCountryCode("United States")).toBe("US");
    expect(resolveCountryCode("Portugal")).toBe("PT");
  });

  it("accepts ISO alpha-2 input", () => {
    expect(resolveCountryCode("ES")).toBe("ES");
    expect(resolveCountryCode("es")).toBe("ES");
  });

  it("accepts ISO alpha-3 input", () => {
    expect(resolveCountryCode("ESP")).toBe("ES");
    expect(resolveCountryCode("PRT")).toBe("PT");
  });

  it("accepts non-English aliases (es locale)", () => {
    expect(resolveCountryCode("España")).toBe("ES");
  });

  it("normalizes accents/whitespace before lookup", () => {
    expect(resolveCountryCode("  ESPAÑA  ")).toBe("ES");
  });

  it("returns null for unknown input", () => {
    expect(resolveCountryCode("Atlantis")).toBeNull();
    expect(resolveCountryCode(null)).toBeNull();
    expect(resolveCountryCode("")).toBeNull();
  });
});
