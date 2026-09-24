import { Link } from "react-router-dom";
import { Users as UsersIcon, Loader2 } from "lucide-react";
import { useListStreamFacesQuery } from "@/services/faces";
import { FaceCrop } from "@/components/faces/face-crop";
import { cn } from "@/lib/utils";

function formatShortId(id: string) {
  return id.slice(0, 8);
}

export const PeopleBlock = ({ streamId }: { streamId: string }) => {
  const { data, isLoading, error } = useListStreamFacesQuery(streamId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 border-4 border-foreground/20 bg-card py-8 mb-6 rounded-none">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
        <span className="text-[10px] uppercase font-bold text-muted-foreground">
          Loading people...
        </span>
      </div>
    );
  }

  if (error || !data) return null;

  if (data.clusters.length === 0) {
    return (
      <div className="flex items-center justify-center gap-2 border-4 border-foreground/20 bg-card py-8 mb-6 rounded-none">
        <UsersIcon className="size-5 text-muted-foreground" />
        <span className="text-[10px] uppercase font-bold text-muted-foreground">
          No people detected
        </span>
      </div>
    );
  }

  return (
    <div className="border-4 border-foreground/20 bg-card shadow-[4px_4px_0_0_rgba(0,0,0,0.3)] p-4 mb-6 rounded-none">
      <h3 className="text-xs uppercase font-bold tracking-tight mb-3">
        People in this video
      </h3>
      <ul className="flex flex-col gap-2">
        {data.clusters.map(({ cluster, count }) => (
          <li key={cluster.id}>
            <Link
              to={`/people/${cluster.id}`}
              className="flex items-center gap-3 border-2 border-foreground/15 bg-background hover:bg-accent px-3 py-2 transition-colors"
            >
              <FaceCrop
                clusterId={cluster.id}
                hasCrop={Boolean(cluster.crop_object)}
              />
              <span className="flex-1 min-w-0">
                <span className="block text-[11px] uppercase font-bold tracking-tight truncate">
                  {cluster.is_named
                    ? cluster.name
                    : `Person ${formatShortId(cluster.id)}`}
                </span>
                <span className="block text-[10px] uppercase text-muted-foreground mt-0.5">
                  {count} frame{count === 1 ? "" : "s"} in this video ·{" "}
                  {cluster.sample_count} total
                </span>
              </span>
              <span
                className={cn(
                  "text-[9px] uppercase font-bold px-1.5 py-0.5 border shrink-0",
                  cluster.is_named
                    ? "text-green-600 border-green-600"
                    : "text-muted-foreground border-foreground/30",
                )}
              >
                {cluster.is_named ? "named" : "unnamed"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};