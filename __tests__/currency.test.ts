import { describe, it, expect } from "vitest";
import {
  ACTIVE_CURRENCIES,
  STATIC_CURRENCY_FALLBACK,
  STATIC_CURRENCY_LABEL_MAP,
  STATIC_CURRENCY_REGISTRY,
  buildCurrencyLabelMap,
  formatCurrencyLabel,
  isCurrency,
  normalizeAndCheckCurrency,
} from "../src/currency";

describe("ACTIVE_CURRENCIES tuple", () => {
  it("matches the 12 canonical backend rows", () => {
    // Mirrors `cellarnode-backend-v2/src/db/canonical/reference-data.ts`
    // (`dataId: "active_currencies"`, `canonicalVersion: 2`). Adjust both
    // in lockstep when the backend canonical row grows.
    expect(ACTIVE_CURRENCIES.length).toBe(12);
    expect([...ACTIVE_CURRENCIES]).toEqual([
      "EUR",
      "SEK",
      "USD",
      "GBP",
      "NOK",
      "DKK",
      "CHF",
      "PLN",
      "CZK",
      "CAD",
      "AUD",
      "JPY",
    ]);
  });

  it("has unique entries", () => {
    expect(new Set(ACTIVE_CURRENCIES).size).toBe(ACTIVE_CURRENCIES.length);
  });

  it("uses uppercase ISO-4217 codes", () => {
    for (const code of ACTIVE_CURRENCIES) {
      expect(code).toMatch(/^[A-Z]{3}$/);
    }
  });
});

describe("STATIC_CURRENCY_FALLBACK + REGISTRY + LABEL_MAP", () => {
  it("mirrors the tuple", () => {
    expect([...STATIC_CURRENCY_FALLBACK]).toEqual([...ACTIVE_CURRENCIES]);
    expect(STATIC_CURRENCY_REGISTRY.map((r) => r.code)).toEqual([
      ...ACTIVE_CURRENCIES,
    ]);
    expect(STATIC_CURRENCY_LABEL_MAP.EUR).toBe("EUR");
    expect(STATIC_CURRENCY_LABEL_MAP.JPY).toBe("JPY");
  });
});

describe("formatCurrencyLabel", () => {
  it("returns empty string for null / undefined / empty", () => {
    expect(formatCurrencyLabel(null)).toBe("");
    expect(formatCurrencyLabel(undefined)).toBe("");
    expect(formatCurrencyLabel("")).toBe("");
    expect(formatCurrencyLabel("   ")).toBe("");
  });

  it("returns the canonical code for a known value", () => {
    expect(formatCurrencyLabel("EUR")).toBe("EUR");
    expect(formatCurrencyLabel("JPY")).toBe("JPY");
  });

  it("uppercases case-insensitive input before lookup", () => {
    expect(formatCurrencyLabel("eur")).toBe("EUR");
    expect(formatCurrencyLabel(" usd ")).toBe("USD");
  });

  it("echoes the input back for an unknown code", () => {
    // BTC is not a canonical code — should come back verbatim so the
    // user sees the raw value rather than a blank cell.
    expect(formatCurrencyLabel("BTC")).toBe("BTC");
    // ISO-4217 valid but NOT in the active registry:
    expect(formatCurrencyLabel("INR")).toBe("INR");
  });

  it("returns empty for non-string types", () => {
    expect(formatCurrencyLabel(123 as unknown as string)).toBe("");
  });

  it("uses a consumer-supplied label map when provided", () => {
    const customMap = {
      EUR: "EUR — Euro",
      USD: "USD — US Dollar",
    };
    expect(formatCurrencyLabel("EUR", customMap)).toBe("EUR — Euro");
    expect(formatCurrencyLabel("USD", customMap)).toBe("USD — US Dollar");
    // Unknown in custom map → echo (lowercase-trimmed-uppercased then
    // missing in map; falls back to the trimmed input).
    expect(formatCurrencyLabel("GBP", customMap)).toBe("GBP");
  });
});

describe("buildCurrencyLabelMap", () => {
  it("returns the static fallback for null / empty input", () => {
    expect(buildCurrencyLabelMap(null)).toBe(STATIC_CURRENCY_LABEL_MAP);
    expect(buildCurrencyLabelMap(undefined)).toBe(STATIC_CURRENCY_LABEL_MAP);
    expect(buildCurrencyLabelMap([])).toBe(STATIC_CURRENCY_LABEL_MAP);
  });

  it("accepts plain string arrays", () => {
    const map = buildCurrencyLabelMap(["EUR", "USD"]);
    expect(map.EUR).toBe("EUR");
    expect(map.USD).toBe("USD");
  });

  it("accepts { code, label } entries", () => {
    const map = buildCurrencyLabelMap([
      { code: "EUR", label: "EUR — Euro" },
      { code: "USD" },
    ]);
    expect(map.EUR).toBe("EUR — Euro");
    expect(map.USD).toBe("USD");
  });

  it("uppercases keys and trims whitespace", () => {
    const map = buildCurrencyLabelMap([
      { code: " eur ", label: "Euro" },
      "  gbp  ",
    ]);
    expect(map.EUR).toBe("Euro");
    expect(map.GBP).toBe("GBP");
  });

  it("skips malformed rows", () => {
    const map = buildCurrencyLabelMap([
      { code: "EUR", label: "Euro" },
      { code: "", label: "Empty Code" },
      // @ts-expect-error — intentionally malformed
      { code: 42, label: "Number Code" },
      { code: "USD", label: undefined },
    ]);
    expect(Object.keys(map).sort()).toEqual(["EUR", "USD"]);
    expect(map.USD).toBe("USD");
  });

  it("falls back to the static map when every row is malformed", () => {
    // Defense-in-depth: mirrors `buildCountryLabelMap` so a partially-
    // broken backend that returns rows but every row is malformed leaves
    // consumers with the canonical static floor instead of an empty map.
    const map = buildCurrencyLabelMap([
      { code: "", label: "Empty" },
      // @ts-expect-error — intentionally malformed
      { code: 42, label: "Number" },
    ]);
    expect(map).toBe(STATIC_CURRENCY_LABEL_MAP);
  });
});

describe("isCurrency", () => {
  it("returns true for exact canonical uppercase codes", () => {
    expect(isCurrency("EUR")).toBe(true);
    expect(isCurrency("JPY")).toBe(true);
    expect(isCurrency("PLN")).toBe(true);
    expect(isCurrency("CZK")).toBe(true);
  });

  it("returns false for non-canonical-case input (no normalisation)", () => {
    // A type predicate that returned true for "eur" would lie — the
    // value would narrow to `"EUR" | "USD" | …`, but the runtime string
    // is still "eur", so downstream persistence would write a code the
    // union claims is impossible. Use `normalizeAndCheckCurrency` for
    // normalise-then-check behaviour. Mirrors the CEL-338 reviewer
    // correction on `isCountryCode`.
    expect(isCurrency("eur")).toBe(false);
    expect(isCurrency(" usd ")).toBe(false);
    expect(isCurrency("Eur")).toBe(false);
  });

  it("returns false for non-canonical codes", () => {
    expect(isCurrency("BTC")).toBe(false);
    expect(isCurrency("XAU")).toBe(false);
    // ISO-4217 valid but NOT in our active registry — registry is the
    // contract:
    expect(isCurrency("INR")).toBe(false);
    expect(isCurrency("CNY")).toBe(false);
  });

  it("returns false for non-string input", () => {
    expect(isCurrency(123)).toBe(false);
    expect(isCurrency(null)).toBe(false);
    expect(isCurrency(undefined)).toBe(false);
  });
});

describe("normalizeAndCheckCurrency", () => {
  it("returns the canonical code for exact uppercase input", () => {
    expect(normalizeAndCheckCurrency("EUR")).toBe("EUR");
    expect(normalizeAndCheckCurrency("JPY")).toBe("JPY");
  });

  it("normalises case + whitespace and returns the canonical code", () => {
    expect(normalizeAndCheckCurrency("eur")).toBe("EUR");
    expect(normalizeAndCheckCurrency(" usd ")).toBe("USD");
    expect(normalizeAndCheckCurrency("Eur")).toBe("EUR");
  });

  it("returns null for codes outside the registry", () => {
    expect(normalizeAndCheckCurrency("BTC")).toBeNull();
    expect(normalizeAndCheckCurrency("INR")).toBeNull();
    expect(normalizeAndCheckCurrency("")).toBeNull();
    expect(normalizeAndCheckCurrency("   ")).toBeNull();
  });
});
