import { Link } from "react-router-dom";
import { Loader2, Users as UsersIcon, Sparkles } from "lucide-react";
import { useListFacesQuery } from "@/services/faces";
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

export const PeoplePage = () => {
  const { data, isLoading, error } = useListFacesQuery();

  const clusters: FacesListResponse["clusters"] | undefined = data?.clusters;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2 className="text-2xl font-bold uppercase tracking-tighter select-none cursor-default">
          People
        </h2>
        {data?.total !== undefined && (
          <span className="text-[10px] uppercase font-bold text-muted-foreground">
            {data.total} cluster{data.total === 1 ? "" : "s"}
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

      {clusters && clusters.length > 0 && (
        <ul className="flex flex-col gap-2">
          {clusters.map((c) => (
            <li key={c.id}>
              <Link
                to={`/people/${c.id}`}
                className="w-full flex items-center gap-3 border-4 bg-card text-foreground hover:bg-accent border-foreground/20 shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 rounded-none px-4 py-3 transition-colors"
              >
                <span className="inline-flex items-center justify-center size-9 shrink-0 border-2 border-foreground/30 bg-background text-primary">
                  <UsersIcon className="size-5" />
                </span>
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
                <Sparkles className="size-4 text-muted-foreground shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};