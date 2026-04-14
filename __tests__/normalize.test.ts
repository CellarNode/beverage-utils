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

import { parseVolumeToLiters } from "../src/normalize";

describe("parseVolumeToLiters", () => {
  it("parses liter formats", () => {
    expect(parseVolumeToLiters("5000 L")).toBe(5000);
    expect(parseVolumeToLiters("5000L")).toBe(5000);
    expect(parseVolumeToLiters("5000 liters")).toBe(5000);
    expect(parseVolumeToLiters("5000 litres")).toBe(5000);
  });

  it("parses kL/hL/mL", () => {
    expect(parseVolumeToLiters("5 kL")).toBe(5000);
    expect(parseVolumeToLiters("20 hl")).toBe(2000);
    expect(parseVolumeToLiters("750 ml")).toBe(0.75);
  });

  it("parses bottle-count formats: 'bottles 750ml × 4000'", () => {
    expect(parseVolumeToLiters("bottles 750ml × 4000")).toBe(3000);
    expect(parseVolumeToLiters("bottles 750 ml x 4000")).toBe(3000);
    expect(parseVolumeToLiters("4000 × 750ml")).toBe(3000);
  });

  it("parses bare numbers (assumed liters)", () => {
    expect(parseVolumeToLiters("330")).toBe(330);
    expect(parseVolumeToLiters(330)).toBe(330);
  });

  it("returns null on parse failure", () => {
    expect(parseVolumeToLiters("about a lot")).toBeNull();
    expect(parseVolumeToLiters("")).toBeNull();
    expect(parseVolumeToLiters(null)).toBeNull();
    expect(parseVolumeToLiters(undefined)).toBeNull();
  });
});
