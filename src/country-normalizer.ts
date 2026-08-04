import countries from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json" with { type: "json" };
import esLocale from "i18n-iso-countries/langs/es.json" with { type: "json" };
import svLocale from "i18n-iso-countries/langs/sv.json" with { type: "json" };

import {
  COUNTRY_CODES,
  type CountryCode,
} from "./country-codes.generated.js";

countries.registerLocale(enLocale);
countries.registerLocale(esLocale);
countries.registerLocale(svLocale);

const COUNTRY_CODE_SET: ReadonlySet<string> = new Set(COUNTRY_CODES);
const COUNTRY_NAME_LOCALES = ["en", "es", "sv"] as const;

export function isCountryCode(value: unknown): value is CountryCode {
  return typeof value === "string" && COUNTRY_CODE_SET.has(value);
}

function countryNameKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

const COUNTRY_CODE_BY_LOCALIZED_NAME = new Map<
  string,
  CountryCode | null
>();

function addCountryNameAlias(name: string, code: CountryCode): void {
  const key = countryNameKey(name);
  const existingCode = COUNTRY_CODE_BY_LOCALIZED_NAME.get(key);
  if (existingCode === undefined) {
    COUNTRY_CODE_BY_LOCALIZED_NAME.set(key, code);
    return;
  }
  if (existingCode !== code) {
    COUNTRY_CODE_BY_LOCALIZED_NAME.set(key, null);
  }
}

function addCountryNameAndCommaAlias(name: string, code: CountryCode): void {
  addCountryNameAlias(name, code);
  const qualifierStart = name.indexOf(",");
  if (qualifierStart > 0) {
    addCountryNameAlias(name.slice(0, qualifierStart), code);
  }
}

for (const locale of COUNTRY_NAME_LOCALES) {
  const localizedNames = countries.getNames(locale, { select: "all" });
  for (const [code, names] of Object.entries(localizedNames)) {
    if (!isCountryCode(code)) continue;
    for (const name of names) {
      addCountryNameAndCommaAlias(name, code);
    }
  }
}

/** Normalize an ISO alpha-2/alpha-3 code or localized name to alpha-2. */
export function normalizeCountryToRegistryCode(
  raw: string | null | undefined,
): CountryCode | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;

  const upper = trimmed.toUpperCase();
  if (upper.length === 2 && isCountryCode(upper)) return upper;

  if (upper.length === 3) {
    const alpha2 = countries.alpha3ToAlpha2(upper);
    if (isCountryCode(alpha2)) return alpha2;
  }

  return COUNTRY_CODE_BY_LOCALIZED_NAME.get(countryNameKey(trimmed)) ?? null;
}

/** @deprecated Use normalizeCountryToRegistryCode instead. */
export function resolveCountryCode(
  raw: string | null | undefined,
): CountryCode | null {
  return normalizeCountryToRegistryCode(raw);
}
