/**
 * CEL-406 — canonical static-export hardening.
 *
 * Two guarantees this file pins:
 *   1. Every `STATIC_*_REGISTRY` / `STATIC_*_FALLBACK` export is frozen
 *      (top-level array + per-entry objects where applicable), so a
 *      consumer that accidentally mutates a shared canonical array/entry
 *      throws in strict mode instead of silently corrupting the singleton.
 *   2. `buildCountryLabelMap` trims the name and falls back to the
 *      canonical code when the name is blank/whitespace-only.
 *
 * The `STATIC_*_LABEL_MAP` exports were already frozen pre-CEL-406; the
 * gap was the registry/fallback arrays.
 */
import { describe, it, expect } from "vitest";
import {
  STATIC_ACCESS_MODEL_REGISTRY,
  STATIC_ACCESS_MODEL_FALLBACK,
} from "../src/access-models";
import {
  STATIC_CLOSURE_REGISTRY,
  STATIC_CLOSURE_FALLBACK,
} from "../src/closure";
import {
  STATIC_COUNTRY_FALLBACK,
  buildCountryLabelMap,
} from "../src/country";
import {
  STATIC_CURRENCY_REGISTRY,
  STATIC_CURRENCY_FALLBACK,
} from "../src/currency";
import {
  STATIC_PACKAGING_REGISTRY,
  STATIC_PACKAGING_FALLBACK,
} from "../src/packaging";
import {
  STATIC_PROCUREMENT_CHANNEL_REGISTRY,
  STATIC_PROCUREMENT_CHANNEL_FALLBACK,
} from "../src/procurement-channels";

describe("CEL-406 — frozen static exports", () => {
  // Top-level array freeze across all six concerns (+ the two object
  // registries' first entry, to prove per-entry freeze).
  const arrays: Array<[string, readonly unknown[]]> = [
    ["STATIC_ACCESS_MODEL_REGISTRY", STATIC_ACCESS_MODEL_REGISTRY],
    ["STATIC_ACCESS_MODEL_FALLBACK", STATIC_ACCESS_MODEL_FALLBACK],
    ["STATIC_CLOSURE_REGISTRY", STATIC_CLOSURE_REGISTRY],
    ["STATIC_CLOSURE_FALLBACK", STATIC_CLOSURE_FALLBACK],
    ["STATIC_COUNTRY_FALLBACK", STATIC_COUNTRY_FALLBACK],
    ["STATIC_CURRENCY_REGISTRY", STATIC_CURRENCY_REGISTRY],
    ["STATIC_CURRENCY_FALLBACK", STATIC_CURRENCY_FALLBACK],
    ["STATIC_PACKAGING_REGISTRY", STATIC_PACKAGING_REGISTRY],
    ["STATIC_PACKAGING_FALLBACK", STATIC_PACKAGING_FALLBACK],
    [
      "STATIC_PROCUREMENT_CHANNEL_REGISTRY",
      STATIC_PROCUREMENT_CHANNEL_REGISTRY,
    ],
    [
      "STATIC_PROCUREMENT_CHANNEL_FALLBACK",
      STATIC_PROCUREMENT_CHANNEL_FALLBACK,
    ],
  ];

  it.each(arrays)("%s is frozen", (_name, arr) => {
    expect(Object.isFrozen(arr)).toBe(true);
  });

  it.each(arrays)("%s rejects push() in strict mode", (_name, arr) => {
    // ESM modules run in strict mode, so a write to a frozen array throws.
    expect(() => (arr as unknown[]).push({})).toThrow(TypeError);
  });

  // Per-entry freeze for the object-bearing registries.
  const objectRegistries: Array<[string, ReadonlyArray<object>]> = [
    ["STATIC_ACCESS_MODEL_REGISTRY", STATIC_ACCESS_MODEL_REGISTRY],
    ["STATIC_CLOSURE_REGISTRY", STATIC_CLOSURE_REGISTRY],
    ["STATIC_COUNTRY_FALLBACK", STATIC_COUNTRY_FALLBACK],
    ["STATIC_CURRENCY_REGISTRY", STATIC_CURRENCY_REGISTRY],
    ["STATIC_PACKAGING_REGISTRY", STATIC_PACKAGING_REGISTRY],
    [
      "STATIC_PROCUREMENT_CHANNEL_REGISTRY",
      STATIC_PROCUREMENT_CHANNEL_REGISTRY,
    ],
  ];

  it.each(objectRegistries)("%s entries are frozen", (_name, arr) => {
    for (const entry of arr) {
      expect(Object.isFrozen(entry)).toBe(true);
    }
  });

  it.each(objectRegistries)(
    "%s entries reject mutation in strict mode",
    (_name, arr) => {
      expect(() => {
        (arr[0] as Record<string, unknown>).injected = true;
      }).toThrow(TypeError);
    },
  );
});

describe("CEL-406 — buildCountryLabelMap blank-name fallback", () => {
  it("falls back to the canonical code when the name is blank", () => {
    const map = buildCountryLabelMap([{ code: "fr", name: "   " }]);
    expect(map.FR).toBe("FR");
  });

  it("trims a padded name", () => {
    const map = buildCountryLabelMap([{ code: "it", name: "  Italy  " }]);
    expect(map.IT).toBe("Italy");
  });

  it("keeps a normal name", () => {
    const map = buildCountryLabelMap([{ code: "es", name: "Spain" }]);
    expect(map.ES).toBe("Spain");
  });
});
