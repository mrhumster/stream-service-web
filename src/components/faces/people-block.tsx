import { useState } from "react";
import { Link } from "react-router-dom";
import { Users as UsersIcon, Loader2, Unlink as UnlinkIcon } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useListStreamFacesQuery, useDetachFaceFromStreamMutation } from "@/services/faces";
import { FaceCrop } from "@/components/faces/face-crop";
import { cn } from "@/lib/utils";
import type { FaceCluster } from "@/types/face.types";

const pixelBtnOutline =
  "inline-flex items-center justify-center gap-2 bg-card text-card-foreground hover:bg-accent border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 rounded-none uppercase text-xs h-9 px-4 font-bold";

const pixelBtnDestructive =
  "inline-flex items-center justify-center gap-2 bg-destructive text-destructive-foreground hover:bg-destructive/90 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 rounded-none uppercase text-xs h-9 px-4 font-bold";

function formatShortId(id: string) {
  return id.slice(0, 8);
}

function personLabel(cluster: FaceCluster) {
  return cluster.is_named ? cluster.name : `Person ${formatShortId(cluster.id)}`;
}

export const PeopleBlock = ({ streamId }: { streamId: string }) => {
  const { data, isLoading, error } = useListStreamFacesQuery(streamId);
  const [detach, { isLoading: detaching }] = useDetachFaceFromStreamMutation();
  const [pending, setPending] = useState<{
    cluster: FaceCluster;
    count: number;
  } | null>(null);

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

  const willDelete =
    pending != null && pending.cluster.sample_count === pending.count;

  const handleDetach = async () => {
    if (!pending) return;
    const target = pending;
    try {
      await detach({ streamId, clusterId: target.cluster.id }).unwrap();
      toast.success("Person removed from this video");
      setPending(null);
    } catch (e) {
      const detail =
        e && typeof e === "object" && "data" in e
          ? (e as { data?: { detail?: string } }).data?.detail
          : undefined;
      toast.error(detail || "Failed to remove person from this video");
    }
  };

  return (
    <div className="border-4 border-foreground/20 bg-card shadow-[4px_4px_0_0_rgba(0,0,0,0.3)] p-4 mb-6 rounded-none">
      <h3 className="text-xs uppercase font-bold tracking-tight mb-3">
        People in this video
      </h3>
      <ul className="flex flex-col gap-2">
        {data.clusters.map(({ cluster, count }) => (
          <li
            key={cluster.id}
            className="flex items-stretch gap-2 border-2 border-foreground/15 bg-background hover:bg-accent transition-colors"
          >
            <Link
              to={`/people/${cluster.id}`}
              className="flex flex-1 min-w-0 items-center gap-3 px-3 py-2"
            >
              <FaceCrop
                clusterId={cluster.id}
                hasCrop={Boolean(cluster.crop_object)}
              />
              <span className="flex-1 min-w-0">
                <span className="block text-[11px] uppercase font-bold tracking-tight truncate">
                  {personLabel(cluster)}
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
            <button
              type="button"
              onClick={() => setPending({ cluster, count })}
              disabled={detaching}
              title="Remove from this video"
              aria-label="Remove from this video"
              className="flex shrink-0 items-center justify-center px-3 text-muted-foreground hover:text-destructive disabled:opacity-40 transition-colors"
            >
              <UnlinkIcon className="size-4" />
            </button>
          </li>
        ))}
      </ul>

      <Dialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open && !detaching) setPending(null);
        }}
      >
        <DialogContent className="border-4 border-primary shadow-[8px_8px_0_0_rgba(0,0,0,1)] rounded-none max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm uppercase tracking-wider">
              Remove person from this video?
            </DialogTitle>
            <DialogDescription className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {pending && (
                <>
                  {personLabel(pending.cluster)} — {pending.count} frame
                  {pending.count === 1 ? "" : "s"} in this video.
                  {willDelete && (
                    <> The person has no frames left and will be deleted entirely.</>
                  )}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              className={pixelBtnOutline}
              onClick={() => setPending(null)}
              disabled={detaching}
            >
              Cancel
            </button>
            <button
              type="button"
              className={pixelBtnDestructive}
              onClick={handleDetach}
              disabled={detaching}
            >
              {detaching ? "Removing..." : "Remove"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};