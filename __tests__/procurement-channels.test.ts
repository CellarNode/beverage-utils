import { describe, it, expect } from "vitest";
import {
  PROCUREMENT_CHANNELS,
  STATIC_PROCUREMENT_CHANNEL_FALLBACK,
  STATIC_PROCUREMENT_CHANNEL_LABEL_MAP,
  STATIC_PROCUREMENT_CHANNEL_REGISTRY,
  buildProcurementChannelLabelMap,
  formatProcurementChannelLabel,
  getProcurementChannelEntry,
  isProcurementChannel,
  normalizeAndCheckProcurementChannel,
} from "../src/procurement-channels";

describe("PROCUREMENT_CHANNELS tuple", () => {
  it("matches the 3 canonical backend rows in order", () => {
    // Mirrors `cellarnode-backend-v2/src/db/canonical/reference-data.ts`
    // (`dataId: "procurement_channels"`, `canonicalVersion: 2`). Adjust
    // both in lockstep when the backend canonical row grows.
    expect(PROCUREMENT_CHANNELS.length).toBe(3);
    expect([...PROCUREMENT_CHANNELS]).toEqual([
      "monopoly",
      "importer",
      "direct",
    ]);
  });

  it("has unique entries", () => {
    expect(new Set(PROCUREMENT_CHANNELS).size).toBe(PROCUREMENT_CHANNELS.length);
  });

  it("uses lowercase ids", () => {
    for (const id of PROCUREMENT_CHANNELS) {
      expect(id).toMatch(/^[a-z]+$/);
    }
  });
});

describe("STATIC_PROCUREMENT_CHANNEL_REGISTRY", () => {
  it("mirrors the canonical backend row content", () => {
    expect(STATIC_PROCUREMENT_CHANNEL_REGISTRY.length).toBe(3);
    expect(STATIC_PROCUREMENT_CHANNEL_REGISTRY[0]).toEqual({
      id: "monopoly",
      name: "State Monopoly",
      description:
        "Government-controlled retail (Systembolaget, Vinmonopolet, LCBO, SAQ)",
      defaultAccessModel: "directed",
      isMonopoly: true,
    });
    expect(STATIC_PROCUREMENT_CHANNEL_REGISTRY[1]).toEqual({
      id: "importer",
      name: "Importer",
      description: "Direct importer request for specific beverages",
      defaultAccessModel: "directed",
      isMonopoly: false,
    });
    expect(STATIC_PROCUREMENT_CHANNEL_REGISTRY[2]).toEqual({
      id: "direct",
      name: "Direct",
      description:
        "Open market request from restaurants, retailers, or other buyers",
      defaultAccessModel: "open",
      isMonopoly: false,
    });
  });
});

describe("STATIC_PROCUREMENT_CHANNEL_FALLBACK + LABEL_MAP", () => {
  it("mirrors the tuple order", () => {
    expect([...STATIC_PROCUREMENT_CHANNEL_FALLBACK]).toEqual([
      ...PROCUREMENT_CHANNELS,
    ]);
  });

  it("label map covers every canonical id", () => {
    expect(STATIC_PROCUREMENT_CHANNEL_LABEL_MAP.monopoly).toBe("State Monopoly");
    expect(STATIC_PROCUREMENT_CHANNEL_LABEL_MAP.importer).toBe("Importer");
    expect(STATIC_PROCUREMENT_CHANNEL_LABEL_MAP.direct).toBe("Direct");
  });
});

describe("formatProcurementChannelLabel", () => {
  it("returns empty string for null / undefined / empty", () => {
    expect(formatProcurementChannelLabel(null)).toBe("");
    expect(formatProcurementChannelLabel(undefined)).toBe("");
    expect(formatProcurementChannelLabel("")).toBe("");
    expect(formatProcurementChannelLabel("   ")).toBe("");
  });

  it("returns the canonical name for a known id", () => {
    expect(formatProcurementChannelLabel("monopoly")).toBe("State Monopoly");
    expect(formatProcurementChannelLabel("importer")).toBe("Importer");
    expect(formatProcurementChannelLabel("direct")).toBe("Direct");
  });

  it("lookups are case-insensitive on the canonical map", () => {
    expect(formatProcurementChannelLabel("MONOPOLY")).toBe("State Monopoly");
    expect(formatProcurementChannelLabel(" Importer ")).toBe("Importer");
  });

  it("echoes the (trimmed) input back for an unknown id", () => {
    expect(formatProcurementChannelLabel("retail")).toBe("retail");
    expect(formatProcurementChannelLabel("  wholesale  ")).toBe("wholesale");
  });

  it("returns empty for non-string types", () => {
    expect(formatProcurementChannelLabel(123 as unknown as string)).toBe("");
  });

  it("uses a consumer-supplied label map when provided", () => {
    const customMap = {
      monopoly: "Estado Monopolio",
      importer: "Importador",
    };
    expect(formatProcurementChannelLabel("monopoly", customMap)).toBe(
      "Estado Monopolio",
    );
    expect(formatProcurementChannelLabel("importer", customMap)).toBe(
      "Importador",
    );
    // Unknown in custom map → echo.
    expect(formatProcurementChannelLabel("direct", customMap)).toBe("direct");
  });
});

describe("buildProcurementChannelLabelMap", () => {
  it("returns the static fallback for null / empty input", () => {
    expect(buildProcurementChannelLabelMap(null)).toBe(
      STATIC_PROCUREMENT_CHANNEL_LABEL_MAP,
    );
    expect(buildProcurementChannelLabelMap(undefined)).toBe(
      STATIC_PROCUREMENT_CHANNEL_LABEL_MAP,
    );
    expect(buildProcurementChannelLabelMap([])).toBe(
      STATIC_PROCUREMENT_CHANNEL_LABEL_MAP,
    );
  });

  it("accepts plain id arrays — defaults to canonical names", () => {
    const map = buildProcurementChannelLabelMap(["monopoly", "importer"]);
    expect(map.monopoly).toBe("State Monopoly");
    expect(map.importer).toBe("Importer");
  });

  it("accepts { id, name } entries", () => {
    const map = buildProcurementChannelLabelMap([
      { id: "monopoly", name: "Estado Monopolio" },
      { id: "importer" },
    ]);
    expect(map.monopoly).toBe("Estado Monopolio");
    expect(map.importer).toBe("Importer"); // default to canonical name
  });

  it("trims whitespace on ids and names", () => {
    const map = buildProcurementChannelLabelMap([
      { id: "  monopoly  ", name: "  Estado  " },
    ]);
    expect(map.monopoly).toBe("Estado");
  });

  it("skips malformed rows", () => {
    const map = buildProcurementChannelLabelMap([
      { id: "monopoly", name: "Monopoly" },
      { id: "", name: "Empty Id" },
      // @ts-expect-error — intentionally malformed
      { id: 42, name: "Number Id" },
      { id: "importer", name: undefined },
    ]);
    expect(Object.keys(map).sort()).toEqual(["importer", "monopoly"]);
    expect(map.importer).toBe("Importer");
  });

  it("falls back to the static map when every row is malformed", () => {
    const map = buildProcurementChannelLabelMap([
      { id: "", name: "Empty" },
      // @ts-expect-error — intentionally malformed
      { id: 42, name: "Number" },
    ]);
    expect(map).toBe(STATIC_PROCUREMENT_CHANNEL_LABEL_MAP);
  });
});

describe("isProcurementChannel", () => {
  it("returns true for exact canonical lowercase ids", () => {
    expect(isProcurementChannel("monopoly")).toBe(true);
    expect(isProcurementChannel("importer")).toBe(true);
    expect(isProcurementChannel("direct")).toBe(true);
  });

  it("returns false for non-canonical-case input (no normalisation)", () => {
    expect(isProcurementChannel("Monopoly")).toBe(false);
    expect(isProcurementChannel("MONOPOLY")).toBe(false);
    expect(isProcurementChannel(" importer ")).toBe(false);
  });

  it("returns false for non-canonical ids", () => {
    expect(isProcurementChannel("retail")).toBe(false);
    expect(isProcurementChannel("wholesale")).toBe(false);
    expect(isProcurementChannel("")).toBe(false);
  });

  it("returns false for non-string input", () => {
    expect(isProcurementChannel(123)).toBe(false);
    expect(isProcurementChannel(null)).toBe(false);
    expect(isProcurementChannel(undefined)).toBe(false);
    expect(isProcurementChannel({})).toBe(false);
  });
});

describe("normalizeAndCheckProcurementChannel", () => {
  it("returns the canonical id for exact lowercase input", () => {
    expect(normalizeAndCheckProcurementChannel("monopoly")).toBe("monopoly");
    expect(normalizeAndCheckProcurementChannel("importer")).toBe("importer");
    expect(normalizeAndCheckProcurementChannel("direct")).toBe("direct");
  });

  it("normalises case + whitespace and returns the canonical id", () => {
    expect(normalizeAndCheckProcurementChannel("MONOPOLY")).toBe("monopoly");
    expect(normalizeAndCheckProcurementChannel(" Importer ")).toBe("importer");
    expect(normalizeAndCheckProcurementChannel("Direct")).toBe("direct");
  });

  it("returns null for ids outside the registry", () => {
    expect(normalizeAndCheckProcurementChannel("retail")).toBeNull();
    expect(normalizeAndCheckProcurementChannel("wholesale")).toBeNull();
    expect(normalizeAndCheckProcurementChannel("")).toBeNull();
    expect(normalizeAndCheckProcurementChannel("   ")).toBeNull();
  });
});

describe("getProcurementChannelEntry", () => {
  it("returns the registry entry for a known id", () => {
    const entry = getProcurementChannelEntry("monopoly");
    expect(entry).not.toBeNull();
    expect(entry?.id).toBe("monopoly");
    expect(entry?.name).toBe("State Monopoly");
    expect(entry?.defaultAccessModel).toBe("directed");
    expect(entry?.isMonopoly).toBe(true);
  });

  it("handles case + whitespace", () => {
    expect(getProcurementChannelEntry("MONOPOLY")?.id).toBe("monopoly");
    expect(getProcurementChannelEntry(" importer ")?.id).toBe("importer");
  });

  it("returns null for unknown / empty / null / non-string", () => {
    expect(getProcurementChannelEntry("retail")).toBeNull();
    expect(getProcurementChannelEntry("")).toBeNull();
    expect(getProcurementChannelEntry(null)).toBeNull();
    expect(getProcurementChannelEntry(undefined)).toBeNull();
    expect(getProcurementChannelEntry(42 as unknown as string)).toBeNull();
  });

  it("uses a consumer-supplied registry when provided", () => {
    const customRegistry = [
      {
        id: "monopoly" as const,
        name: "Custom Monopoly",
        defaultAccessModel: "open" as const,
        isMonopoly: false,
      },
    ];
    const entry = getProcurementChannelEntry("monopoly", customRegistry);
    expect(entry?.name).toBe("Custom Monopoly");
    expect(entry?.defaultAccessModel).toBe("open");
    expect(entry?.isMonopoly).toBe(false);
  });
});
