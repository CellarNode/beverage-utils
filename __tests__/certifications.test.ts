import { describe, expect, it } from "vitest";
import {
  CERTIFICATION_TYPES,
  certificationLabelKey,
  isCertification,
  normalizeAndCheckCertification,
} from "../src/index.js";

describe("certificationLabelKey (CEL-1702)", () => {
  it("returns the shared key path and English fallback for the canonical types", () => {
    expect(certificationLabelKey("organic")).toEqual({
      key: "certification.organic",
      fallback: "Organic",
    });
    expect(certificationLabelKey("fairtrade")).toEqual({
      key: "certification.fairtrade",
      fallback: "Fairtrade",
    });
    expect(certificationLabelKey("sustainable")).toEqual({
      key: "certification.sustainable",
      fallback: "Sustainable",
    });
  });

  it("normalises case and whitespace before matching a canonical id", () => {
    expect(certificationLabelKey(" Organic ")).toEqual({
      key: "certification.organic",
      fallback: "Organic",
    });
    expect(certificationLabelKey("FAIRTRADE")).toEqual({
      key: "certification.fairtrade",
      fallback: "Fairtrade",
    });
  });

  it("keeps a stable key and the raw id as fallback for an unknown certification", () => {
    expect(certificationLabelKey("biodynamic")).toEqual({
      key: "certification.biodynamic",
      fallback: "biodynamic",
    });
    expect(certificationLabelKey("")).toEqual({ key: "certification.", fallback: "" });
  });

  it("keeps i18next separators out of the key for unknown ids", () => {
    expect(certificationLabelKey("eu.organic").key).toBe("certification.eu-organic");
    expect(certificationLabelKey("ns:organic").key).toBe("certification.ns-organic");
    expect(certificationLabelKey("eu.organic").fallback).toBe("eu.organic");
  });

  it.each(["constructor", "toString", "__proto__", "valueOf", "hasOwnProperty"])(
    "does not resolve the prototype name %s as a certification",
    (name) => {
      expect(isCertification(name)).toBe(false);
      expect(normalizeAndCheckCertification(name)).toBeNull();
      expect(certificationLabelKey(name).fallback).toBe(name);
    },
  );

  it("rejects non-string and empty input", () => {
    expect(isCertification(undefined)).toBe(false);
    expect(isCertification(42)).toBe(false);
    expect(isCertification("")).toBe(false);
    expect(normalizeAndCheckCertification(null)).toBeNull();
    expect(normalizeAndCheckCertification("   ")).toBeNull();
  });

  it("exposes a frozen canonical id list", () => {
    expect([...CERTIFICATION_TYPES]).toEqual(["organic", "fairtrade", "sustainable"]);
    expect(CERTIFICATION_TYPES.every(isCertification)).toBe(true);
    expect(Object.isFrozen(CERTIFICATION_TYPES)).toBe(true);
    expect(() => {
      (CERTIFICATION_TYPES as unknown as string[]).push("biodynamic");
    }).toThrow();
  });
});
