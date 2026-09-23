import { Link } from "react-router-dom";
import { Loader2, Sparkles, Copy } from "lucide-react";
import { useListFacesQuery } from "@/services/faces";
import { FaceCrop } from "@/components/faces/face-crop";
import type { FacesListResponse } from "@/types/face.types";

function formatShortId(id: string) {
  return id.slice(0, 8);
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function collapseDuplicates(
  clusters: FacesListResponse["clusters"],
): { cluster: FacesListResponse["clusters"][number]; similar: number }[] {
  const byName = new Map<string, FacesListResponse["clusters"]>();
  const singles: FacesListResponse["clusters"] = [];
  for (const c of clusters) {
    if (c.is_named && c.name !== null) {
      const existing = byName.get(c.name);
      if (existing) existing.push(c);
      else byName.set(c.name, [c]);
    } else {
      singles.push(c);
    }
  }

  const out: { cluster: FacesListResponse["clusters"][number]; similar: number }[] =
    singles.map((c) => ({ cluster: c, similar: 0 }));
  for (const group of byName.values()) {
    if (group.length === 1) {
      out.push({ cluster: group[0], similar: 0 });
      continue;
    }
    // Keep the cluster with the most samples as the representative.
    const sorted = [...group].sort((a, b) => b.sample_count - a.sample_count);
    out.push({ cluster: sorted[0], similar: sorted.length - 1 });
  }
  return out.sort((a, b) => {
    const namedCmp = Number(b.cluster.is_named) - Number(a.cluster.is_named);
    if (namedCmp !== 0) return namedCmp;
    const nameA = a.cluster.name ?? "";
    const nameB = b.cluster.name ?? "";
    const nameCmp = nameA.localeCompare(nameB);
    if (nameCmp !== 0) return nameCmp;
    return b.cluster.sample_count - a.cluster.sample_count;
  });
}

export const PeoplePage = () => {
  const { data, isLoading, error } = useListFacesQuery();

  const clusters: FacesListResponse["clusters"] | undefined = data?.clusters;
  const rows =
    clusters && clusters.length > 0 ? collapseDuplicates(clusters) : [];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2 className="text-2xl font-bold uppercase tracking-tighter select-none cursor-default">
          People
        </h2>
        {data?.total !== undefined && (
          <span className="text-[10px] uppercase font-bold text-muted-foreground">
            {data.total} cluster{data.total === 1 ? "" : "s"} · {rows.length}{" "}
            shown
          </span>
        )}
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <p className="text-center text-destructive text-sm uppercase font-bold py-12">
          Failed to load faces
        </p>
      )}

      {data && clusters && clusters.length === 0 && (
        <p className="text-center text-muted-foreground text-sm uppercase font-bold py-12">
          No faces detected yet
        </p>
      )}

      {rows.length > 0 && (
        <ul className="flex flex-col gap-2">
          {rows.map(({ cluster: c, similar }) => (
            <li key={c.id}>
              <Link
                to={`/people/${c.id}`}
                className="w-full flex items-center gap-3 border-4 bg-card text-foreground hover:bg-accent border-foreground/20 shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 rounded-none px-4 py-3 transition-colors"
              >
                <FaceCrop clusterId={c.id} hasCrop={Boolean(c.crop_object)} />
                <span className="flex-1 min-w-0">
                  <span className="block text-[11px] uppercase font-bold tracking-tight truncate">
                    {c.is_named ? c.name : `Person ${formatShortId(c.id)}`}
                  </span>
                  <span className="block text-[10px] uppercase text-muted-foreground mt-0.5">
                    {c.sample_count} sample{c.sample_count === 1 ? "" : "s"} ·{" "}
                    {c.video_count} video{c.video_count === 1 ? "" : "s"} · in{" "}
                    {c.videos?.length ?? 0} stream
                    {(c.videos?.length ?? 0) === 1 ? "" : "s"} ·{" "}
                    {formatTime(c.created_at)}
                  </span>
                </span>
                {similar > 0 && (
                  <span className="inline-flex items-center gap-1 text-[9px] uppercase font-bold px-1.5 py-0.5 border border-foreground/30 text-muted-foreground shrink-0">
                    <Copy className="size-3" />
                    {similar} similar
                  </span>
                )}
                <Sparkles className="size-4 text-muted-foreground shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};