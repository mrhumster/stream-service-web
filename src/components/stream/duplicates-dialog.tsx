import { useState } from "react";
import { CopyX, Loader2, RefreshCw, ShieldAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  useDeleteStreamMutation,
  useGetDuplicateStreamsQuery,
} from "@/services/streams";
import { StreamThumbnail } from "@/components/stream/stream-thumbnail";
import {
  defaultStatus,
  formatDate,
  formatDuration,
  hasThumbnail,
  statusConfig,
  thumbnailUrl,
} from "@/lib/stream-format";
import { cn } from "@/lib/utils";
import type { DuplicateGroup, StreamResponse } from "@/types/stream.types";

interface DuplicatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function StatusBadge({ status }: { status: StreamResponse["status"] }) {
  const cfg = statusConfig[status] ?? defaultStatus;
  return (
    <span
      className={cn(
        "inline-block px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider",
        cfg.className,
      )}
    >
      {cfg.label}
    </span>
  );
}

function thumb(stream: StreamResponse) {
  return hasThumbnail(stream.status) ? (
    <StreamThumbnail
      src={thumbnailUrl(stream.id)}
      alt=""
      rotation={stream.metadata?.rotation}
      className="w-10 h-10 shrink-0 object-cover border-2 border-foreground/10"
      loading="lazy"
    />
  ) : (
    <div className="w-10 h-10 shrink-0 bg-muted border-2 border-foreground/10" />
  );
}

function meta(stream: StreamResponse) {
  const duration = stream.metadata?.duration
    ? formatDuration(stream.metadata.duration)
    : null;
  return (
    <span className="text-[10px] uppercase text-muted-foreground tabular-nums">
      {formatDate(stream.created_at)}
      {duration ? ` · ${duration}` : ""}
    </span>
  );
}

function GroupCard({
  group,
  selected,
  onToggle,
}: {
  group: DuplicateGroup;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={cn(
        "border-4 bg-card p-3",
        selected ? "border-primary" : "border-foreground/20",
      )}
    >
      <label className="flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="size-4 shrink-0 accent-[#ffcc00]"
        />
        <span className="text-xs font-bold uppercase tracking-tight truncate flex-1">
          {group.title}
        </span>
        <span className="text-[10px] uppercase font-bold text-muted-foreground">
          {group.count} copies
        </span>
      </label>

      <div className="mt-3 flex items-center gap-2 border-l-4 border-blue-500 pl-2">
        {thumb(group.keep)}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase text-blue-500">
              Keep
            </span>
            <StatusBadge status={group.keep.status} />
          </div>
          <div className="truncate">{meta(group.keep)}</div>
        </div>
      </div>

      {group.deletable.map((stream) => (
        <div
          key={stream.id}
          className="mt-2 flex items-center gap-2 border-l-4 border-destructive pl-2"
        >
          {thumb(stream)}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase text-destructive">
                Delete
              </span>
              <StatusBadge status={stream.status} />
            </div>
            <div className="truncate">{meta(stream)}</div>
          </div>
        </div>
      ))}

      {group.protected.map((stream) => (
        <div
          key={stream.id}
          className="mt-2 flex items-center gap-2 border-l-4 border-muted-foreground/40 pl-2 opacity-60"
        >
          {thumb(stream)}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">
                Protected
              </span>
              <StatusBadge status={stream.status} />
            </div>
            <div className="truncate">
              {meta(stream)} · published, unpublish to delete
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function DuplicatesDialog({ open, onOpenChange }: DuplicatesDialogProps) {
  const { data, isLoading, isFetching, refetch } =
    useGetDuplicateStreamsQuery(undefined, {
      skip: !open,
      refetchOnMountOrArgChange: true,
    });
  const [deleteStream] = useDeleteStreamMutation();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  const groups = data?.groups ?? [];
  const selectedGroups = groups.filter((g) => selected.has(g.keep.id));
  const totalToDelete = selectedGroups.reduce(
    (n, g) => n + g.deletable.length,
    0,
  );
  const totalProtectedSelected = selectedGroups.reduce(
    (n, g) => n + g.protected.length,
    0,
  );
  const allSelected =
    groups.length > 0 && groups.every((g) => selected.has(g.keep.id));

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(groups.map((g) => g.keep.id)));
  };

  const handleOpenChange = (next: boolean) => {
    if (deleting) return;
    if (!next) {
      setSelected(new Set());
      setConfirmOpen(false);
    }
    onOpenChange(next);
  };

  const runDeduplication = async () => {
    setConfirmOpen(false);
    const ids = selectedGroups.flatMap((g) =>
      g.deletable.map((s) => s.id),
    );
    if (ids.length === 0) return;

    setDeleting(true);
    setProgress({ done: 0, total: ids.length });
    let succeeded = 0;
    let failed = 0;
    for (let i = 0; i < ids.length; i++) {
      try {
        await deleteStream(ids[i]).unwrap();
        succeeded++;
      } catch {
        failed++;
      }
      setProgress({ done: i + 1, total: ids.length });
    }
    setDeleting(false);
    setSelected(new Set());

    if (failed > 0) {
      toast.error(
        `Deleted ${succeeded} of ${ids.length} streams; ${failed} failed`,
      );
    } else {
      toast.success(
        `Deleted ${succeeded} duplicate stream${succeeded === 1 ? "" : "s"}`,
      );
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="border-4 border-foreground/30 shadow-[8px_8px_0_0_rgba(0,0,0,1)] rounded-none max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm uppercase tracking-wider flex items-center gap-2">
              <CopyX className="size-4" />
              Duplicates
            </DialogTitle>
            <DialogDescription className="text-xs uppercase tracking-wider">
              Streams with the same name and duration/size. Older copies are
              deleted; the newest usable copy is kept.
            </DialogDescription>
          </DialogHeader>

          {isLoading && (
            <div className="flex justify-center py-12">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoading && groups.length === 0 && (
            <p className="py-12 text-center text-xs uppercase font-bold text-muted-foreground">
              No duplicates found
            </p>
          )}

          {!isLoading && groups.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={toggleAll}
                  className="text-[10px] uppercase font-bold underline underline-offset-2 hover:text-foreground text-muted-foreground"
                >
                  {allSelected ? "Deselect all" : "Select all groups"}
                </button>
                <button
                  type="button"
                  onClick={() => void refetch()}
                  disabled={isFetching}
                  className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-muted-foreground hover:text-foreground disabled:opacity-50"
                >
                  <RefreshCw
                    className={cn("size-3", isFetching && "animate-spin")}
                  />
                  Rescan
                </button>
              </div>

              <div className="max-h-[50vh] overflow-y-auto flex flex-col gap-3 pr-1">
                {groups.map((group) => (
                  <GroupCard
                    key={group.keep.id}
                    group={group}
                    selected={selected.has(group.keep.id)}
                    onToggle={() => toggle(group.keep.id)}
                  />
                ))}
              </div>
            </>
          )}

          <DialogFooter className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">
              {deleting
                ? `Deleting ${progress.done} / ${progress.total}…`
                : `${selectedGroups.length} group${selectedGroups.length === 1 ? "" : "s"} · ${totalToDelete} to delete`}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleOpenChange(false)}
                disabled={deleting}
                className="inline-flex items-center gap-2 bg-card text-card-foreground hover:bg-accent border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 rounded-none uppercase text-xs h-9 px-4 font-bold disabled:opacity-50 disabled:pointer-events-none"
              >
                Close
              </button>
              <button
                type="button"
                disabled={totalToDelete === 0 || deleting}
                onClick={() => setConfirmOpen(true)}
                className="inline-flex items-center gap-2 bg-destructive text-destructive-foreground hover:bg-destructive/90 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 rounded-none uppercase text-xs h-9 px-4 font-bold disabled:opacity-50 disabled:pointer-events-none"
              >
                {deleting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
                Deduplicate
                {totalToDelete > 0 && ` (${totalToDelete})`}
              </button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="border-4 border-destructive shadow-[8px_8px_0_0_rgba(0,0,0,1)] rounded-none max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm uppercase tracking-wider flex items-center gap-2">
              <ShieldAlert className="size-4" />
              Delete {totalToDelete} stream{totalToDelete === 1 ? "" : "s"}?
            </DialogTitle>
            <DialogDescription className="text-xs uppercase tracking-wider">
              The older copies in the selected groups will be permanently
              removed, together with their thumbnails and detected people.
              {totalProtectedSelected > 0 && (
                <>
                  {" "}
                  {totalProtectedSelected} published cop
                  {totalProtectedSelected === 1 ? "y is" : "ies are"} protected
                  and will be kept.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              className="inline-flex items-center gap-2 bg-card text-card-foreground hover:bg-accent border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 rounded-none uppercase text-xs h-9 px-4 font-bold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void runDeduplication()}
              className="inline-flex items-center gap-2 bg-destructive text-destructive-foreground hover:bg-destructive/90 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 rounded-none uppercase text-xs h-9 px-4 font-bold"
            >
              <Trash2 className="size-4" />
              Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
