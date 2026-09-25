import type { FaceCluster } from "@/types/face.types";

export const SIMILARITY_THRESHOLD = 0.5;

export interface SimilarMember<T extends FaceCluster = FaceCluster> {
  cluster: T;
  sim: number;
}

export interface SimilarityGroup<T extends FaceCluster = FaceCluster> {
  rep: T;
  members: SimilarMember<T>[];
  maxSim: number;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const normA = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
  const normB = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
  if (normA === 0 || normB === 0) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot / (normA * normB);
}

/**
 * Split clusters into connected components where two clusters are connected when
 * their centroid cosine similarity is >= threshold. Each returned group keeps
 * the cluster with the most samples as the representative (named clusters win
 * ties) and the rest as members, sorted by similarity to the representative.
 */
export function buildSimilarityGroups<T extends FaceCluster>(
  clusters: T[],
  threshold = SIMILARITY_THRESHOLD,
): SimilarityGroup<T>[] {
  const withVec = clusters.filter(
    (c) => Array.isArray(c.centroid) && c.centroid.length > 0,
  );
  if (withVec.length === 0) return [];

  const parent = new Map<string, string>();
  const find = (id: string): string => {
    let root = id;
    while (parent.get(root) !== root) {
      root = parent.get(root) ?? root;
    }
    let cur = id;
    while (cur !== root) {
      const next = parent.get(cur) ?? cur;
      parent.set(cur, root);
      cur = next;
    }
    return root;
  };
  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(rb, ra);
  };

  for (const c of withVec) parent.set(c.id, c.id);

  for (let i = 0; i < withVec.length; i++) {
    for (let j = i + 1; j < withVec.length; j++) {
      const a = withVec[i].centroid!;
      const b = withVec[j].centroid!;
      if (cosineSimilarity(a, b) >= threshold) {
        union(withVec[i].id, withVec[j].id);
      }
    }
  }

  const byRoot = new Map<string, T[]>();
  for (const c of withVec) {
    const root = find(c.id);
    const list = byRoot.get(root);
    if (list) list.push(c);
    else byRoot.set(root, [c]);
  }

  const groups: SimilarityGroup<T>[] = [];
  for (const list of byRoot.values()) {
    if (list.length < 2) continue;
    const rep = [...list].sort((a, b) => {
      if (Number(b.is_named) !== Number(a.is_named)) {
        return Number(b.is_named) - Number(a.is_named);
      }
      return b.sample_count - a.sample_count;
    })[0];
    const members = list
      .filter((c) => c.id !== rep.id)
      .map((c) => ({
        cluster: c,
        sim: cosineSimilarity(c.centroid!, rep.centroid!),
      }))
      .sort((a, b) => b.sim - a.sim);
    let maxSim = 0;
    for (const m of members) maxSim = Math.max(maxSim, m.sim);
    groups.push({ rep, members, maxSim });
  }

  return groups.sort((a, b) => b.maxSim - a.maxSim);
}

export function formatPercent(sim: number): string {
  return `${Math.round(sim * 100)}%`;
}