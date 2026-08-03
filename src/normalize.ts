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

export {
  normalizeCountryToRegistryCode,
  resolveCountryCode,
} from "./country-normalizer.js";

/**
 * Parse a free-text or numeric volume into liters.
 * Reason: capacity-fit signal must compare apples-to-apples; producer-entered
 * production volumes use mixed units. Returns null on parse failure (signal skipped,
 * never penalizing on bad data).
 */
export function parseVolumeToLiters(raw: string | number | null | undefined): number | null {
  if (raw == null || raw === "") return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;

  const s = raw.trim().toLowerCase();
  if (!s) return null;

  // bottle-count patterns: "bottles 750ml × 4000" / "4000 × 750ml" / with x
  const bottleMatch = s.match(
    /(?:bottles?\s+)?(\d+(?:\.\d+)?)\s*(ml|cl|l)\s*[×x]\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*[×x]\s*(\d+(?:\.\d+)?)\s*(ml|cl|l)/,
  );
  if (bottleMatch) {
    const [, sizeA, unitA, countA, countB, sizeB, unitB] = bottleMatch;
    const size = sizeA != null ? Number(sizeA) : Number(sizeB);
    const count = sizeA != null ? Number(countA) : Number(countB);
    const unit = (unitA ?? unitB).toLowerCase();
    const factor = unit === "ml" ? 0.001 : unit === "cl" ? 0.01 : 1;
    return size * count * factor;
  }

  // unit suffix: kL, hL, L, ml, cL, liters/litres
  const unitMatch = s.match(/^(\d+(?:\.\d+)?)\s*(kl|hl|l|ml|cl|liters?|litres?)\b/);
  if (unitMatch) {
    const [, n, u] = unitMatch;
    const v = Number(n);
    switch (u.toLowerCase()) {
      case "kl": return v * 1000;
      case "hl": return v * 100;
      case "l":
      case "liter":
      case "liters":
      case "litre":
      case "litres":
        return v;
      case "ml": return v * 0.001;
      case "cl": return v * 0.01;
    }
  }

  // bare number → assumed liters
  if (/^\d+(?:\.\d+)?$/.test(s)) return Number(s);
  return null;
}
