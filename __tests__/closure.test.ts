import { describe, it, expect } from "vitest";
import {
  CLOSURE_OPTIONS,
  STATIC_CLOSURE_FALLBACK,
  STATIC_CLOSURE_LABEL_MAP,
  STATIC_CLOSURE_REGISTRY,
  buildClosureLabelMap,
  formatClosureLabel,
  isClosure,
  normalizeAndCheckClosure,
} from "../src/closure";

describe("CLOSURE_OPTIONS tuple", () => {
  it("matches the 6 canonical backend rows", () => {
    expect(CLOSURE_OPTIONS.length).toBe(6);
    expect([...CLOSURE_OPTIONS]).toEqual([
      "Natural cork",
      "Technical cork",
      "Screw cap",
      "Glass closure",
      "Crown cap",
      "Other",
    ]);
  });

  it("has unique entries", () => {
    expect(new Set(CLOSURE_OPTIONS).size).toBe(CLOSURE_OPTIONS.length);
  });

  it("includes the canonical 'Other' row (NOT the free-text escape hatch)", () => {
    // The canonical 'Other' means "unspecified / rare closure type" and
    // is shown as a normal dropdown row. The free-text escape hatch
    // uses a separate `__other__` internal sentinel — see the
    // <ClosureSelect> component for the disambiguation.
    expect(CLOSURE_OPTIONS).toContain("Other");
  });
});

describe("STATIC_CLOSURE_FALLBACK + REGISTRY + LABEL_MAP", () => {
  it("mirrors the tuple", () => {
    expect([...STATIC_CLOSURE_FALLBACK]).toEqual([...CLOSURE_OPTIONS]);
    expect(STATIC_CLOSURE_REGISTRY.map((r) => r.value)).toEqual([
      ...CLOSURE_OPTIONS,
    ]);
    expect(STATIC_CLOSURE_LABEL_MAP["Natural cork"]).toBe("Natural cork");
  });
});

describe("formatClosureLabel", () => {
  it("returns empty string for null / undefined / empty", () => {
    expect(formatClosureLabel(null)).toBe("");
    expect(formatClosureLabel(undefined)).toBe("");
    expect(formatClosureLabel("")).toBe("");
    expect(formatClosureLabel("   ")).toBe("");
  });

  it("returns the canonical label for a known value", () => {
    expect(formatClosureLabel("Natural cork")).toBe("Natural cork");
    expect(formatClosureLabel("Screw cap")).toBe("Screw cap");
    expect(formatClosureLabel("Other")).toBe("Other");
  });

  it("matches case-insensitively when canonical casing differs", () => {
    expect(formatClosureLabel("natural cork")).toBe("Natural cork");
    expect(formatClosureLabel("SCREW CAP")).toBe("Screw cap");
  });

  it("echoes the input back for an unknown value", () => {
    expect(formatClosureLabel("Plastic stopper")).toBe("Plastic stopper");
  });

  it("returns empty for non-string types", () => {
    expect(formatClosureLabel(123 as unknown as string)).toBe("");
  });

  it("uses a consumer-supplied label map when provided", () => {
    const customMap = { "Natural cork": "Natural cork (premium)" };
    expect(formatClosureLabel("Natural cork", customMap)).toBe(
      "Natural cork (premium)",
    );
    expect(formatClosureLabel("Screw cap", customMap)).toBe("Screw cap");
  });
});

describe("buildClosureLabelMap", () => {
  it("returns the static fallback for null / empty input", () => {
    expect(buildClosureLabelMap(null)).toBe(STATIC_CLOSURE_LABEL_MAP);
    expect(buildClosureLabelMap(undefined)).toBe(STATIC_CLOSURE_LABEL_MAP);
    expect(buildClosureLabelMap([])).toBe(STATIC_CLOSURE_LABEL_MAP);
  });

  it("accepts plain string arrays", () => {
    const map = buildClosureLabelMap(["Natural cork", "Other"]);
    expect(map["Natural cork"]).toBe("Natural cork");
    expect(map.Other).toBe("Other");
  });

  it("accepts { value, label } entries", () => {
    const map = buildClosureLabelMap([
      { value: "Natural cork", label: "Natural cork (premium)" },
      { value: "Screw cap" },
    ]);
    expect(map["Natural cork"]).toBe("Natural cork (premium)");
    expect(map["Screw cap"]).toBe("Screw cap");
  });

  it("skips malformed rows", () => {
    const map = buildClosureLabelMap([
      { value: "Natural cork", label: "Natural cork" },
      { value: "", label: "Empty" },
      // @ts-expect-error — intentionally malformed
      { value: 42, label: "Number" },
    ]);
    expect(Object.keys(map)).toEqual(["Natural cork"]);
  });

  it("falls back to the static map when every row is malformed", () => {
    const map = buildClosureLabelMap([
      { value: "", label: "Empty" },
      // @ts-expect-error — intentionally malformed
      { value: 42, label: "Number" },
    ]);
    expect(map).toBe(STATIC_CLOSURE_LABEL_MAP);
  });
});

describe("isClosure", () => {
  it("returns true for exact canonical values", () => {
    expect(isClosure("Natural cork")).toBe(true);
    expect(isClosure("Other")).toBe(true);
  });

  it("returns false for non-canonical-case input", () => {
    expect(isClosure("natural cork")).toBe(false);
    expect(isClosure("OTHER")).toBe(false);
  });

  it("returns false for non-canonical values", () => {
    expect(isClosure("Plastic stopper")).toBe(false);
  });

  it("returns false for non-string input", () => {
    expect(isClosure(123)).toBe(false);
    expect(isClosure(null)).toBe(false);
  });
});

describe("normalizeAndCheckClosure", () => {
  it("returns the canonical value for exact input", () => {
    expect(normalizeAndCheckClosure("Natural cork")).toBe("Natural cork");
  });

  it("normalises case + whitespace and returns the canonical value", () => {
    expect(normalizeAndCheckClosure("natural cork")).toBe("Natural cork");
    expect(normalizeAndCheckClosure(" SCREW CAP ")).toBe("Screw cap");
    expect(normalizeAndCheckClosure("other")).toBe("Other");
  });

  it("returns null for values outside the registry", () => {
    expect(normalizeAndCheckClosure("Plastic stopper")).toBeNull();
    expect(normalizeAndCheckClosure("")).toBeNull();
  });
});
