import { describe, expect, it } from "vitest";
import {
  CERTIFICATION_TYPES,
  certificationLabelKey,
  isCertificationType,
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

  it("keeps a stable key and the raw id as fallback for an unknown certification", () => {
    expect(certificationLabelKey("biodynamic")).toEqual({
      key: "certification.biodynamic",
      fallback: "biodynamic",
    });
  });

  it("does not resolve prototype names as certifications", () => {
    expect(isCertificationType("constructor")).toBe(false);
    expect(certificationLabelKey("constructor").fallback).toBe("constructor");
  });

  it("exposes the canonical id list", () => {
    expect([...CERTIFICATION_TYPES]).toEqual(["organic", "fairtrade", "sustainable"]);
    expect(CERTIFICATION_TYPES.every(isCertificationType)).toBe(true);
  });
});
