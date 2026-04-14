/**
 * Canonicalize a free-text identifier for case/accent/whitespace-insensitive comparison.
 * Reason: signal comparisons (region, country aliases, classification labels) must be
 * deterministic regardless of how the producer typed the value.
 */
export function normalizeToken(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

import countries from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json" with { type: "json" };
import esLocale from "i18n-iso-countries/langs/es.json" with { type: "json" };
import svLocale from "i18n-iso-countries/langs/sv.json" with { type: "json" };

countries.registerLocale(enLocale);
countries.registerLocale(esLocale);
countries.registerLocale(svLocale);

/**
 * Resolve any country reference (English/ES/SV name, ISO alpha-2/3) to canonical alpha-2.
 * Reason: producers and opportunities spell countries inconsistently; ranking must
 * compare canonical codes, never strings.
 */
export function resolveCountryCode(
  raw: string | null | undefined
): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const upper = trimmed.toUpperCase();
  if (upper.length === 2 && countries.isValid(upper)) return upper;
  if (upper.length === 3) {
    const a2 = countries.alpha3ToAlpha2(upper);
    if (a2) return a2;
  }

  for (const lang of ["en", "es", "sv"]) {
    const code = countries.getAlpha2Code(trimmed, lang);
    if (code) return code;
  }

  const cleaned = trimmed
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  for (const lang of ["en", "es", "sv"]) {
    const code = countries.getAlpha2Code(cleaned, lang);
    if (code) return code;
  }

  return null;
}
