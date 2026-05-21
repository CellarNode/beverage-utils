import { describe, it, expect } from "vitest";
import {
  COUNTRY_CODES,
  STATIC_COUNTRY_FALLBACK,
  STATIC_COUNTRY_LABEL_MAP,
  buildCountryLabelMap,
  formatCountryLabel,
  isCountryCode,
  normalizeAndCheckCountryCode,
} from "../src/country";

describe("COUNTRY_CODES tuple", () => {
  it("matches the 40 canonical backend rows", () => {
    // Mirrors `cellarnode-backend-v2/src/db/canonical/reference-data.ts:252-300`
    // (`dataId: "country_codes"`). Adjust both in lockstep when the
    // backend canonical row grows.
    expect(COUNTRY_CODES.length).toBe(40);
  });

  it("has unique entries", () => {
    expect(new Set(COUNTRY_CODES).size).toBe(COUNTRY_CODES.length);
  });

  it("uses uppercase ISO-3166 alpha-2 codes", () => {
    for (const code of COUNTRY_CODES) {
      expect(code).toMatch(/^[A-Z]{2}$/);
    }
  });
});

describe("STATIC_COUNTRY_FALLBACK", () => {
  it("contains the five most common producer countries", () => {
    const codes = STATIC_COUNTRY_FALLBACK.map((e) => e.code);
    expect(codes).toEqual(["FR", "IT", "ES", "DE", "US"]);
  });

  it("derives the label map from the same source", () => {
    expect(STATIC_COUNTRY_LABEL_MAP.FR).toBe("France");
    expect(STATIC_COUNTRY_LABEL_MAP.US).toBe("United States");
  });
});

describe("formatCountryLabel", () => {
  it("returns empty string for null / undefined / empty", () => {
    expect(formatCountryLabel(null)).toBe("");
    expect(formatCountryLabel(undefined)).toBe("");
    expect(formatCountryLabel("")).toBe("");
    expect(formatCountryLabel("   ")).toBe("");
  });

  it("returns the canonical name for a known code", () => {
    expect(formatCountryLabel("FR")).toBe("France");
    expect(formatCountryLabel("US")).toBe("United States");
  });

  it("uppercases case-insensitive input", () => {
    expect(formatCountryLabel("fr")).toBe("France");
    expect(formatCountryLabel("us ")).toBe("United States");
  });

  it("echoes the input back for an unknown code", () => {
    // ZZ is not a canonical code; "ZZ" should come back verbatim so the
    // user sees the raw value rather than a blank cell.
    expect(formatCountryLabel("ZZ")).toBe("ZZ");
  });

  it("returns empty for non-string types", () => {
    // Non-string types come through unmolested from upstream APIs in
    // some consumer setups; the formatter must not crash.
    expect(formatCountryLabel(123 as unknown as string)).toBe("");
  });

  it("uses a consumer-supplied label map when provided", () => {
    const customMap = { FR: "France (Premium)", DE: "Germany (Beta)" };
    expect(formatCountryLabel("FR", customMap)).toBe("France (Premium)");
    expect(formatCountryLabel("DE", customMap)).toBe("Germany (Beta)");
    // Unknown in custom map → echo
    expect(formatCountryLabel("IT", customMap)).toBe("IT");
  });
});

describe("buildCountryLabelMap", () => {
  it("returns the static fallback for null / empty input", () => {
    expect(buildCountryLabelMap(null)).toBe(STATIC_COUNTRY_LABEL_MAP);
    expect(buildCountryLabelMap(undefined)).toBe(STATIC_COUNTRY_LABEL_MAP);
    expect(buildCountryLabelMap([])).toBe(STATIC_COUNTRY_LABEL_MAP);
  });

  it("builds a code → name lookup from runtime entries", () => {
    const map = buildCountryLabelMap([
      { code: "FR", name: "France" },
      { code: "JP", name: "Japan" },
    ]);
    expect(map.FR).toBe("France");
    expect(map.JP).toBe("Japan");
  });

  it("uppercases keys and trims whitespace", () => {
    const map = buildCountryLabelMap([
      { code: " fr ", name: "France" },
    ]);
    expect(map.FR).toBe("France");
  });

  it("skips malformed rows", () => {
    const map = buildCountryLabelMap([
      { code: "FR", name: "France" },
      { code: "", name: "Empty Code" },
      // @ts-expect-error — intentionally malformed
      { code: 42, name: "Number Code" },
      // @ts-expect-error — intentionally malformed
      { code: "JP", name: null },
    ]);
    expect(Object.keys(map)).toEqual(["FR"]);
  });

  it("falls back to the static label map when every row is malformed", () => {
    // Defense-in-depth: a partially-broken backend that returns rows but
    // every row is malformed should still leave consumers with the
    // documented static floor instead of an empty map.
    const map = buildCountryLabelMap([
      { code: "", name: "Empty" },
      // @ts-expect-error — intentionally malformed
      { code: 42, name: "Number" },
      // @ts-expect-error — intentionally malformed
      { code: "JP", name: null },
    ]);
    expect(map).toBe(STATIC_COUNTRY_LABEL_MAP);
  });
});

describe("isCountryCode", () => {
  it("returns true for exact canonical uppercase codes", () => {
    expect(isCountryCode("FR")).toBe(true);
    expect(isCountryCode("AE")).toBe(true);
  });

  it("returns false for non-canonical-case input (no normalization)", () => {
    // A type predicate that returned true for "fr" would lie — the
    // value would narrow to `"FR" | "IT" | …`, but the runtime string
    // is still "fr", so downstream persistence would write a code the
    // union claims is impossible. Use `normalizeAndCheckCountryCode`
    // for normalize-then-check behavior.
    expect(isCountryCode("fr")).toBe(false);
    expect(isCountryCode(" us ")).toBe(false);
    expect(isCountryCode("Us")).toBe(false);
  });

  it("returns false for non-canonical codes", () => {
    expect(isCountryCode("ZZ")).toBe(false);
    expect(isCountryCode("XX")).toBe(false);
    // ISO-3166 valid but NOT in our registry — registry is the contract:
    expect(isCountryCode("JE")).toBe(false);
    expect(isCountryCode("AX")).toBe(false);
  });

  it("returns false for non-string input", () => {
    expect(isCountryCode(123)).toBe(false);
    expect(isCountryCode(null)).toBe(false);
    expect(isCountryCode(undefined)).toBe(false);
  });
});

describe("normalizeAndCheckCountryCode", () => {
  it("returns the canonical code for exact uppercase input", () => {
    expect(normalizeAndCheckCountryCode("FR")).toBe("FR");
    expect(normalizeAndCheckCountryCode("AE")).toBe("AE");
  });

  it("normalizes case + whitespace and returns the canonical code", () => {
    expect(normalizeAndCheckCountryCode("fr")).toBe("FR");
    expect(normalizeAndCheckCountryCode(" us ")).toBe("US");
    expect(normalizeAndCheckCountryCode("Us")).toBe("US");
  });

  it("returns null for codes outside the registry", () => {
    expect(normalizeAndCheckCountryCode("ZZ")).toBeNull();
    expect(normalizeAndCheckCountryCode("JE")).toBeNull();
    expect(normalizeAndCheckCountryCode("AX")).toBeNull();
    expect(normalizeAndCheckCountryCode("")).toBeNull();
    expect(normalizeAndCheckCountryCode("   ")).toBeNull();
  });
});
