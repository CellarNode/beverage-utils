import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import countries from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json" with { type: "json" };
import { describe, expect, it } from "vitest";
import {
  buildCountryLabelMap,
  COUNTRY_CODES,
  type CountryCode,
  formatCountryLabel,
  isCountryCode,
  normalizeAndCheckCountryCode,
  STATIC_COUNTRY_FALLBACK,
  STATIC_COUNTRY_LABEL_MAP,
} from "../src/country";
import { normalizeCountryToRegistryCode } from "../src/index";

countries.registerLocale(enLocale);

const CURATED_COUNTRY_LABELS: Readonly<
  Partial<Record<CountryCode, string>>
> = {
  FR: "France",
  IT: "Italy",
  ES: "Spain",
  PT: "Portugal",
  DE: "Germany",
  AT: "Austria",
  GR: "Greece",
  HU: "Hungary",
  GB: "United Kingdom",
  CH: "Switzerland",
  BE: "Belgium",
  NL: "Netherlands",
  DK: "Denmark",
  SE: "Sweden",
  NO: "Norway",
  FI: "Finland",
  PL: "Poland",
  CZ: "Czechia",
  HR: "Croatia",
  SI: "Slovenia",
  GE: "Georgia",
  TR: "Turkey",
  LB: "Lebanon",
  ZA: "South Africa",
  US: "United States",
  CA: "Canada",
  MX: "Mexico",
  AR: "Argentina",
  CL: "Chile",
  UY: "Uruguay",
  BR: "Brazil",
  AU: "Australia",
  NZ: "New Zealand",
  JP: "Japan",
  CN: "China",
  KR: "South Korea",
  IN: "India",
  TH: "Thailand",
  SG: "Singapore",
  AE: "United Arab Emirates",
};

describe("i18n-iso-countries version pin", () => {
  it("is pinned to an exact version, not a caret range", () => {
    // i18n-iso-countries feeds the committed+published codegen output in
    // src/country-codes.generated.ts. A caret range lets a patch bump
    // (e.g. an upstream label rename) silently drift that generated file.
    // See scripts/generate-country-codes.mjs for the full rationale.
    const packageJsonUrl = new URL("../package.json", import.meta.url);
    const packageJson = JSON.parse(
      readFileSync(fileURLToPath(packageJsonUrl), "utf8"),
    );
    const pinned = packageJson.dependencies["i18n-iso-countries"];
    expect(pinned).toBe("7.14.0");
    expect(pinned).not.toMatch(/^[\^~]/);
  });
});

describe("COUNTRY_CODES tuple", () => {
  it("matches the alpha-2 set from the pinned dataset", () => {
    const pinnedCodes = Object.keys(countries.getAlpha2Codes()).sort();
    expect(COUNTRY_CODES).toEqual(pinnedCodes);
  });

  it("includes Moldova", () => {
    expect(COUNTRY_CODES).toContain("MD");
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
  it("covers every generated country code", () => {
    const codes = STATIC_COUNTRY_FALLBACK.map((entry) => entry.code);
    expect(codes).toEqual(COUNTRY_CODES);
  });

  it("preserves exactly the curated labels over generated English names", () => {
    const englishNames = countries.getNames("en", { select: "official" });
    for (const entry of STATIC_COUNTRY_FALLBACK) {
      const expected = CURATED_COUNTRY_LABELS[entry.code] ?? englishNames[entry.code];
      expect(entry.name).toBe(expected);
      expect(STATIC_COUNTRY_LABEL_MAP[entry.code]).toBe(expected);
    }
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
    expect(formatCountryLabel("CZ")).toBe("Czechia");
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
      { code: "FR", name: "France (Live)" },
      { code: "JP", name: "Japan (Live)" },
    ]);
    expect(map.FR).toBe("France (Live)");
    expect(map.JP).toBe("Japan (Live)");
    expect(map.MD).toBe(STATIC_COUNTRY_LABEL_MAP.MD);
  });

  it("uppercases keys and trims whitespace", () => {
    const map = buildCountryLabelMap([{ code: " fr ", name: "France" }]);
    expect(map.FR).toBe("France");
  });

  it("skips malformed rows", () => {
    const map = buildCountryLabelMap([
      { code: "FR", name: "France" },
      { code: "", name: "Empty Code" },
      { code: 42, name: "Number Code" },
      { code: "JP", name: null },
    ]);
    expect(map.FR).toBe("France");
    expect(map.JP).toBe(STATIC_COUNTRY_LABEL_MAP.JP);
  });

  it("falls back to the static label map when every row is malformed", () => {
    // Defense-in-depth: a partially-broken backend that returns rows but
    // every row is malformed should still leave consumers with the
    // documented static floor instead of an empty map.
    const map = buildCountryLabelMap([
      { code: "", name: "Empty" },
      { code: 42, name: "Number" },
      { code: "JP", name: null },
    ]);
    expect(map).toBe(STATIC_COUNTRY_LABEL_MAP);
  });
});

describe("isCountryCode", () => {
  it("returns true for exact canonical uppercase codes", () => {
    expect(isCountryCode("FR")).toBe(true);
    expect(isCountryCode("AE")).toBe(true);
    expect(isCountryCode("MD")).toBe(true);
    expect(isCountryCode("JE")).toBe(true);
    expect(isCountryCode("AX")).toBe(true);
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
  });

  it("returns false for non-string input", () => {
    expect(isCountryCode(123)).toBe(false);
    expect(isCountryCode(null)).toBe(false);
    expect(isCountryCode(undefined)).toBe(false);
  });
});

describe("normalizeAndCheckCountryCode", () => {
  it("widens a country name before narrowing to the registry code", () => {
    expect(normalizeAndCheckCountryCode("Moldova")).toBe("MD");
  });

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
    expect(normalizeAndCheckCountryCode("")).toBeNull();
    expect(normalizeAndCheckCountryCode("   ")).toBeNull();
  });
});

describe("normalizeCountryToRegistryCode", () => {
  it.each(["Congo", "Virgin Islands"])(
    "returns null for %s, which names two different countries",
    (raw) => {
      expect(normalizeCountryToRegistryCode(raw)).toBeNull();
    },
  );

  it.each([
    ["Democratic Republic of the Congo", "CD"],
    ["Republic of the Congo", "CG"],
    ["Virgin Islands, British", "VG"],
    ["Virgin Islands, U.S.", "VI"],
    ["Korea, Republic of", "KR"],
  ])("maps the unambiguous name %s to %s", (raw, expected) => {
    expect(normalizeCountryToRegistryCode(raw)).toBe(expected);
  });

  it.each([
    ["España", "ES"],
    ["Moldova", "MD"],
    ["MDA", "MD"],
    ["MD", "MD"],
    [" us ", "US"],
  ])("maps %s to %s", (raw, expected) => {
    expect(normalizeCountryToRegistryCode(raw)).toBe(expected);
  });

  it.each(["not-a-country", "", "   ", null, undefined])(
    "returns null for %s",
    (raw) => {
      expect(normalizeCountryToRegistryCode(raw)).toBeNull();
    },
  );
});
