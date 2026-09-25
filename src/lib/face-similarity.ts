export const SIMILARITY_THRESHOLD = 0.5;

export function formatPercent(sim: number): string {
  return `${Math.round(sim * 100)}%`;
}