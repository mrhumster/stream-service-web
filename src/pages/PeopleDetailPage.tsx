import { useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  Loader2,
  ArrowLeft,
  Undo,
  Check,
  PenSquare,
  Upload,
  Delete,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useGetFaceQuery,
  useRenameFaceMutation,
  useReplaceFaceCropMutation,
  useDeleteFaceMutation,
} from "@/services/faces";
import { FaceCrop } from "@/components/faces/face-crop";
import { cn } from "@/lib/utils";

const pixelBtnOutline =
  "inline-flex items-center justify-center gap-2 bg-card text-card-foreground hover:bg-accent border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 rounded-none uppercase text-xs h-9 px-4 font-bold";

const pixelBtnDestructive =
  "inline-flex items-center justify-center gap-2 bg-destructive text-destructive-foreground hover:bg-destructive/90 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 rounded-none uppercase text-xs h-9 px-4 font-bold";

function formatShortId(id: string) {
  return id.slice(0, 8);
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatSeconds(s: number) {
  const total = Math.max(0, Math.floor(s));
  const m = Math.floor(total / 60);
  const sec = total % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export const PeopleDetailPage = () => {
  const { clusterId } = useParams<{ clusterId: string }>();
  const navigate = useNavigate();

  const { data, isLoading, error } = useGetFaceQuery(clusterId!, {
    skip: !clusterId,
  });
  const [renameFace, { isLoading: renaming }] = useRenameFaceMutation();
  const [replaceCrop, { isLoading: replacing }] = useReplaceFaceCropMutation();
  const [deleteFace, { isLoading: deleting }] = useDeleteFaceMutation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState<string>("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const cluster = data?.cluster;

  const onPickFile = async (file: File | null) => {
    if (!file || !cluster) return;
    try {
      await replaceCrop({ id: cluster.id, file }).unwrap();
      toast.success("Picture updated");
    } catch (err) {
      const detail = (err as { data?: { detail?: string } } | undefined)?.data
        ?.detail;
      toast.error(detail ? `Failed: ${detail}` : "Failed to update picture");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const openEditor = () => {
    setName(cluster?.name ?? "");
    setEditing(true);
  };

  const commitRename = async () => {
    const cleaned = name.trim();
    if (!cluster) return;
    try {
      await renameFace({ id: cluster.id, body: { name: cleaned || null } }).unwrap();
      setEditing(false);
      toast.success("Name updated");
    } catch {
      toast.error("Failed to update name");
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate("/people")}
        className="inline-flex items-center gap-2 text-[10px] uppercase font-bold text-muted-foreground hover:text-primary mb-4 transition-colors"
      >
        <ArrowLeft className="size-3.5" />
        Back to people
      </button>

      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <p className="text-center text-destructive text-sm uppercase font-bold py-12">
          Failed to load face
        </p>
      )}

      {cluster && !editing && (
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <FaceCrop
            clusterId={cluster.id}
            hasCrop={Boolean(cluster.crop_object)}
            lazy={false}
            className="size-16 border-4 border-foreground/30"
            iconClassName="size-8"
          />
          <h2 className="text-2xl font-bold uppercase tracking-tighter select-none cursor-default">
            {cluster.is_named ? cluster.name : `Person ${formatShortId(cluster.id)}`}
          </h2>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={replacing}
            aria-label="Replace picture"
            className="inline-flex items-center gap-2 border-2 border-black bg-card text-card-foreground hover:bg-accent px-3 py-1.5 text-[10px] uppercase font-bold shadow-[2px_2px_0_0_rgba(0,0,0,0.8)] active:shadow-none active:translate-x-[1px] active:translate-y-[1px] rounded-none disabled:opacity-50"
          >
            <Upload className="size-3.5" />
            {replacing ? "Uploading..." : "Replace picture"}
          </button>
          <button
            type="button"
            onClick={openEditor}
            aria-label="Rename"
            className="inline-flex items-center gap-2 border-2 border-black bg-card text-card-foreground hover:bg-accent px-3 py-1.5 text-[10px] uppercase font-bold shadow-[2px_2px_0_0_rgba(0,0,0,0.8)] active:shadow-none active:translate-x-[1px] active:translate-y-[1px] rounded-none"
          >
            <PenSquare className="size-3.5" />
            {cluster.is_named ? "Rename" : "Name"}
          </button>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            aria-label="Delete person"
            className="inline-flex items-center gap-2 border-2 border-black bg-destructive text-destructive-foreground hover:bg-destructive/90 px-3 py-1.5 text-[10px] uppercase font-bold shadow-[2px_2px_0_0_rgba(0,0,0,0.8)] active:shadow-none active:translate-x-[1px] active:translate-y-[1px] rounded-none"
          >
            <Delete className="size-3.5" />
            Delete
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => void onPickFile(e.target.files?.[0] ?? null)}
          />
        </div>
      )}

      {cluster && editing && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <input
            autoFocus
            value={name}
            maxLength={120}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void commitRename()}
            placeholder="Name (leave empty to unname)"
            className="border-4 border-black bg-background px-3 py-1.5 text-xs uppercase font-bold outline-none focus:border-primary min-w-[220px] rounded-none"
          />
          <button
            type="button"
            onClick={commitRename}
            disabled={renaming}
            aria-label="Save name"
            className="inline-flex items-center gap-2 border-2 border-black bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1.5 text-[10px] uppercase font-bold shadow-[2px_2px_0_0_rgba(0,0,0,0.8)] active:shadow-none active:translate-x-[1px] active:translate-y-[1px] rounded-none disabled:opacity-50"
          >
            <Check className="size-3.5" />
            {renaming ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            aria-label="Cancel rename"
            className="inline-flex items-center gap-2 border-2 border-black bg-muted text-muted-foreground hover:bg-accent px-3 py-1.5 text-[10px] uppercase font-bold shadow-[2px_2px_0_0_rgba(0,0,0,0.8)] active:shadow-none active:translate-x-[1px] active:translate-y-[1px] rounded-none"
          >
            <Undo className="size-3.5" />
            Cancel
          </button>
        </div>
      )}

      {cluster && (
        <p className="text-[10px] uppercase font-bold text-muted-foreground mb-6">
          {cluster.sample_count} sample{cluster.sample_count === 1 ? "" : "s"} ·{" "}
          created {formatTime(cluster.created_at)}
        </p>
      )}

      {data?.videos && data.videos.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs uppercase font-bold tracking-tight mb-2">
            Videos
          </h3>
          <ul className="flex flex-col gap-1.5">
            {data.videos.map((v) => (
              <li key={v.stream_id}>
                <Link
                  to={`/streams/${v.stream_id}`}
                  className="inline-flex items-center gap-2 text-[10px] uppercase font-bold text-muted-foreground hover:text-primary underline underline-offset-2"
                >
                  stream/{v.stream_id.slice(0, 8)}
                  <span className="text-primary">
                    {v.count} frame{v.count === 1 ? "" : "s"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {data && data.occurrences.length === 0 && (
        <p className="text-center text-muted-foreground text-sm uppercase font-bold py-12">
          No occurrences yet
        </p>
      )}

      {data?.occurrences && data.occurrences.length > 0 && (
        <ul className="flex flex-col gap-2">
          {data.occurrences.map((o, i) => (
            <li
              key={`${o.stream_id}-${o.t_seconds}-${i}`}
              className="w-full flex items-center gap-3 border-2 border-foreground/15 bg-card px-4 py-3 transition-colors"
            >
              <Link
                to={`/streams/${o.stream_id}`}
                className="flex-1 min-w-0"
              >
                <span className="block text-[11px] uppercase font-bold tracking-tight truncate hover:text-primary">
                  stream/{o.stream_id.slice(0, 8)}
                </span>
                <span className="block text-[10px] uppercase text-muted-foreground mt-0.5">
                  at {formatSeconds(o.t_seconds)} ·{" "}
                  {Math.round(o.confidence * 100)}% ·{" "}
                  {formatTime(o.created_at)}
                </span>
              </Link>
              <span
                className={cn(
                  "text-[9px] uppercase font-bold px-1.5 py-0.5 border",
                  o.confidence >= 0.7
                    ? "text-green-600 border-green-600"
                    : o.confidence >= 0.4
                      ? "text-yellow-600 border-yellow-600"
                      : "text-muted-foreground border-foreground/30",
                )}
              >
                {Math.round(o.confidence * 100)}%
              </span>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={confirmDelete}
        onOpenChange={(open) => !open && setConfirmDelete(false)}
      >
        <DialogContent className="border-4 border-primary shadow-[8px_8px_0_0_rgba(0,0,0,1)] rounded-none max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm uppercase tracking-wider">
              Delete person?
            </DialogTitle>
            <DialogDescription className="text-xs uppercase tracking-wider">
              {cluster?.sample_count} sample{cluster?.sample_count === 1 ? "" : "s"} ·{" "}
              {data?.videos.length ?? 0} stream{data?.videos.length === 1 ? "" : "s"} ·
              This action cannot be undone and allows re-detection.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              className={pixelBtnOutline}
              onClick={() => setConfirmDelete(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className={pixelBtnDestructive}
              disabled={deleting}
              onClick={async () => {
                if (!cluster) return;
                try {
                  await deleteFace(cluster.id).unwrap();
                  setConfirmDelete(false);
                  toast.success("Person deleted");
                  navigate("/people");
                } catch (err) {
                  const detail = (err as { data?: { detail?: string } } | undefined)
                    ?.data?.detail;
                  toast.error(detail ? `Failed: ${detail}` : "Failed to delete person");
                }
              }}
            >
              {deleting ? "Deleting..." : "Delete"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};