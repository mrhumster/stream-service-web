export const SIMILARITY_THRESHOLD = 0.5;

/** Similarity that renders as "100%" (formatPercent rounds). A group whose
 * every member clears this is an exact duplicate — the same person — and can be
 * merged without a human decision. Mirrors the server's
 * EXACT_DUPLICATE_THRESHOLD. */
export const EXACT_DUPLICATE_SIMILARITY = 0.995;

export function formatPercent(sim: number): string {
  return `${Math.round(sim * 100)}%`;
}