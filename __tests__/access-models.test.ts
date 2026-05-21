import { describe, it, expect } from "vitest";
import {
  ACCESS_MODELS,
  STATIC_ACCESS_MODEL_FALLBACK,
  STATIC_ACCESS_MODEL_LABEL_MAP,
  STATIC_ACCESS_MODEL_REGISTRY,
  buildAccessModelLabelMap,
  formatAccessModelLabel,
  getAccessModelEntry,
  isAccessModel,
  normalizeAndCheckAccessModel,
} from "../src/access-models";

describe("ACCESS_MODELS tuple", () => {
  it("matches the 2 canonical backend rows in order", () => {
    // Mirrors `cellarnode-backend-v2/src/db/canonical/reference-data.ts`
    // (`dataId: "access_models"`, `canonicalVersion: 1`).
    expect(ACCESS_MODELS.length).toBe(2);
    expect([...ACCESS_MODELS]).toEqual(["directed", "open"]);
  });

  it("has unique entries", () => {
    expect(new Set(ACCESS_MODELS).size).toBe(ACCESS_MODELS.length);
  });

  it("uses lowercase ids", () => {
    for (const id of ACCESS_MODELS) {
      expect(id).toMatch(/^[a-z]+$/);
    }
  });
});

describe("STATIC_ACCESS_MODEL_REGISTRY", () => {
  it("mirrors the canonical backend row content", () => {
    expect(STATIC_ACCESS_MODEL_REGISTRY.length).toBe(2);
    expect(STATIC_ACCESS_MODEL_REGISTRY[0]).toEqual({
      id: "directed",
      name: "Directed",
      description:
        "Offers routed through recommended or designated importer(s)",
    });
    expect(STATIC_ACCESS_MODEL_REGISTRY[1]).toEqual({
      id: "open",
      name: "Open",
      description:
        "Free competition — any eligible party can compete on price and terms",
    });
  });
});

describe("STATIC_ACCESS_MODEL_FALLBACK + LABEL_MAP", () => {
  it("mirrors the tuple order", () => {
    expect([...STATIC_ACCESS_MODEL_FALLBACK]).toEqual([...ACCESS_MODELS]);
  });

  it("label map covers every canonical id", () => {
    expect(STATIC_ACCESS_MODEL_LABEL_MAP.directed).toBe("Directed");
    expect(STATIC_ACCESS_MODEL_LABEL_MAP.open).toBe("Open");
  });
});

describe("formatAccessModelLabel", () => {
  it("returns empty string for null / undefined / empty", () => {
    expect(formatAccessModelLabel(null)).toBe("");
    expect(formatAccessModelLabel(undefined)).toBe("");
    expect(formatAccessModelLabel("")).toBe("");
    expect(formatAccessModelLabel("   ")).toBe("");
  });

  it("returns the canonical name for a known id", () => {
    expect(formatAccessModelLabel("directed")).toBe("Directed");
    expect(formatAccessModelLabel("open")).toBe("Open");
  });

  it("lookups are case-insensitive on the canonical map", () => {
    expect(formatAccessModelLabel("DIRECTED")).toBe("Directed");
    expect(formatAccessModelLabel(" Open ")).toBe("Open");
  });

  it("echoes the (trimmed) input back for an unknown id", () => {
    expect(formatAccessModelLabel("hybrid")).toBe("hybrid");
    expect(formatAccessModelLabel("  exclusive  ")).toBe("exclusive");
  });

  it("returns empty for non-string types", () => {
    expect(formatAccessModelLabel(123 as unknown as string)).toBe("");
  });

  it("uses a consumer-supplied label map when provided", () => {
    const customMap = {
      directed: "Dirigido",
      open: "Abierto",
    };
    expect(formatAccessModelLabel("directed", customMap)).toBe("Dirigido");
    expect(formatAccessModelLabel("open", customMap)).toBe("Abierto");
  });
});

describe("buildAccessModelLabelMap", () => {
  it("returns the static fallback for null / empty input", () => {
    expect(buildAccessModelLabelMap(null)).toBe(STATIC_ACCESS_MODEL_LABEL_MAP);
    expect(buildAccessModelLabelMap(undefined)).toBe(
      STATIC_ACCESS_MODEL_LABEL_MAP,
    );
    expect(buildAccessModelLabelMap([])).toBe(STATIC_ACCESS_MODEL_LABEL_MAP);
  });

  it("accepts plain id arrays — defaults to canonical names", () => {
    const map = buildAccessModelLabelMap(["directed", "open"]);
    expect(map.directed).toBe("Directed");
    expect(map.open).toBe("Open");
  });

  it("accepts { id, name } entries", () => {
    const map = buildAccessModelLabelMap([
      { id: "directed", name: "Dirigido" },
      { id: "open" },
    ]);
    expect(map.directed).toBe("Dirigido");
    expect(map.open).toBe("Open"); // default to canonical name
  });

  it("trims whitespace on ids and names", () => {
    const map = buildAccessModelLabelMap([
      { id: "  directed  ", name: "  Dirigido  " },
    ]);
    expect(map.directed).toBe("Dirigido");
  });

  it("skips malformed rows", () => {
    const map = buildAccessModelLabelMap([
      { id: "directed", name: "Directed" },
      { id: "", name: "Empty Id" },
      // @ts-expect-error — intentionally malformed
      { id: 42, name: "Number Id" },
      { id: "open", name: undefined },
    ]);
    expect(Object.keys(map).sort()).toEqual(["directed", "open"]);
    expect(map.open).toBe("Open");
  });

  it("falls back to the static map when every row is malformed", () => {
    const map = buildAccessModelLabelMap([
      { id: "", name: "Empty" },
      // @ts-expect-error — intentionally malformed
      { id: 42, name: "Number" },
    ]);
    expect(map).toBe(STATIC_ACCESS_MODEL_LABEL_MAP);
  });
});

describe("isAccessModel", () => {
  it("returns true for exact canonical lowercase ids", () => {
    expect(isAccessModel("directed")).toBe(true);
    expect(isAccessModel("open")).toBe(true);
  });

  it("returns false for non-canonical-case input (no normalisation)", () => {
    expect(isAccessModel("Directed")).toBe(false);
    expect(isAccessModel("DIRECTED")).toBe(false);
    expect(isAccessModel(" open ")).toBe(false);
  });

  it("returns false for non-canonical ids", () => {
    expect(isAccessModel("hybrid")).toBe(false);
    expect(isAccessModel("exclusive")).toBe(false);
    expect(isAccessModel("")).toBe(false);
  });

  it("returns false for non-string input", () => {
    expect(isAccessModel(123)).toBe(false);
    expect(isAccessModel(null)).toBe(false);
    expect(isAccessModel(undefined)).toBe(false);
    expect(isAccessModel({})).toBe(false);
  });
});

describe("normalizeAndCheckAccessModel", () => {
  it("returns the canonical id for exact lowercase input", () => {
    expect(normalizeAndCheckAccessModel("directed")).toBe("directed");
    expect(normalizeAndCheckAccessModel("open")).toBe("open");
  });

  it("normalises case + whitespace and returns the canonical id", () => {
    expect(normalizeAndCheckAccessModel("DIRECTED")).toBe("directed");
    expect(normalizeAndCheckAccessModel(" Open ")).toBe("open");
    expect(normalizeAndCheckAccessModel("Open")).toBe("open");
  });

  it("returns null for ids outside the registry", () => {
    expect(normalizeAndCheckAccessModel("hybrid")).toBeNull();
    expect(normalizeAndCheckAccessModel("exclusive")).toBeNull();
    expect(normalizeAndCheckAccessModel("")).toBeNull();
    expect(normalizeAndCheckAccessModel("   ")).toBeNull();
  });
});

describe("getAccessModelEntry", () => {
  it("returns the registry entry for a known id", () => {
    const entry = getAccessModelEntry("directed");
    expect(entry).not.toBeNull();
    expect(entry?.id).toBe("directed");
    expect(entry?.name).toBe("Directed");
    expect(entry?.description).toBeDefined();
  });

  it("handles case + whitespace", () => {
    expect(getAccessModelEntry("DIRECTED")?.id).toBe("directed");
    expect(getAccessModelEntry(" open ")?.id).toBe("open");
  });

  it("returns null for unknown / empty / null / non-string", () => {
    expect(getAccessModelEntry("hybrid")).toBeNull();
    expect(getAccessModelEntry("")).toBeNull();
    expect(getAccessModelEntry(null)).toBeNull();
    expect(getAccessModelEntry(undefined)).toBeNull();
    expect(getAccessModelEntry(42 as unknown as string)).toBeNull();
  });

  it("uses a consumer-supplied registry when provided", () => {
    const customRegistry = [
      {
        id: "directed" as const,
        name: "Custom Directed",
        description: "custom",
      },
    ];
    const entry = getAccessModelEntry("directed", customRegistry);
    expect(entry?.name).toBe("Custom Directed");
  });
});
