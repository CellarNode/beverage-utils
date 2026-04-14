import { describe, it, expect } from "bun:test";
import { normalizeToken } from "./normalize";

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
