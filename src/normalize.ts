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
