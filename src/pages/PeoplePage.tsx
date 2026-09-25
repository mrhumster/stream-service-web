import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Link } from "react-router-dom";
import { Loader2, Sparkles, Copy, Delete, Merge, Users as UsersIcon } from "lucide-react";
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
  useListFacesQuery,
  useDeleteFaceMutation,
  useMergeFacesMutation,
  useDeleteEmptyFacesMutation,
} from "@/services/faces";
import { FaceCrop } from "@/components/faces/face-crop";
import { formatPercent, SIMILARITY_THRESHOLD } from "@/lib/face-similarity";
import type {
  FaceClusterWithStats,
  FacesListResponse,
  SimilarityGroup,
} from "@/types/face.types";

const PAGE_SIZE = 50;

const pixelBtnOutline =
  "inline-flex items-center justify-center gap-2 bg-card text-card-foreground hover:bg-accent border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 rounded-none uppercase text-xs h-9 px-4 font-bold";

const pixelBtn =
  "inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 rounded-none uppercase text-xs h-9 px-4 font-bold";

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

type Person = FaceClusterWithStats;

interface PersonRowProps {
  person: Person;
  mergeMode: boolean;
  selected: boolean;
  onToggle: (id: string) => void;
  similar?: number;
  simLabel?: string;
  onDelete?: (person: Person) => void;
  children?: ReactNode;
}

function PersonRow({
  person: c,
  mergeMode,
  selected,
  onToggle,
  similar,
  simLabel,
  onDelete,
  children,
}: PersonRowProps) {
  return (
    <li className="flex items-center gap-2 border-4 bg-card text-foreground hover:bg-accent border-foreground/20 shadow-[4px_4px_0_0_rgba(0,0,0,1)] rounded-none px-4 py-3 transition-colors">
      {mergeMode && (
        <label className="inline-flex items-center shrink-0 cursor-pointer">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggle(c.id)}
            className="size-4 accent-[#ffcc00]"
          />
        </label>
      )}
      <Link
        to={`/people/${c.id}`}
        className="flex-1 min-w-0 flex items-center gap-3"
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
        {(similar !== undefined && similar > 0) && (
          <span className="inline-flex items-center gap-1 text-[9px] uppercase font-bold px-1.5 py-0.5 border border-foreground/30 text-muted-foreground shrink-0">
            <Copy className="size-3" />
            {similar} similar{simLabel ? ` · ${simLabel}` : ""}
          </span>
        )}
        {simLabel && similar === 0 && (
          <span className="inline-flex items-center gap-1 text-[9px] uppercase font-bold px-1.5 py-0.5 border border-foreground/30 text-muted-foreground shrink-0">
            {simLabel} similar
          </span>
        )}
      </Link>
      <Sparkles className="size-4 text-muted-foreground shrink-0" />
      {children}
      {!mergeMode && onDelete && (
        <button
          type="button"
          onClick={() => onDelete(c)}
          aria-label="Delete person"
          className="inline-flex items-center justify-center size-8 border-2 border-black bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-[2px_2px_0_0_rgba(0,0,0,0.8)] active:shadow-none active:translate-x-[1px] active:translate-y-[1px] rounded-none"
        >
          <Delete className="size-4" />
        </button>
      )}
    </li>
  );
}

function SimilarGroupCard({
  group,
  mergeMode,
  selected,
  onToggle,
  onDelete,
  onSelectAll,
}: {
  group: SimilarityGroup<Person>;
  mergeMode: boolean;
  selected: Set<string>;
  onToggle: (id: string) => void;
  onDelete: (person: Person) => void;
  onSelectAll: (group: SimilarityGroup<Person>) => void;
}) {
  return (
    <li className="border-4 bg-card border-foreground/20 shadow-[4px_4px_0_0_rgba(0,0,0,1)] rounded-none overflow-hidden">
      <PersonRow
        person={group.rep}
        mergeMode={mergeMode}
        selected={selected.has(group.rep.id)}
        onToggle={onToggle}
        similar={group.members.length}
        simLabel={formatPercent(group.maxSim)}
        onDelete={onDelete}
      >
{mergeMode && (
          <button
            type="button"
            onClick={() => onSelectAll(group)}
            aria-label="Select all similar people"
            className="inline-flex items-center gap-1 text-[10px] uppercase font-bold border-2 border-black bg-primary text-primary-foreground hover:bg-primary/90 px-2 py-1 shadow-[2px_2px_0_0_rgba(0,0,0,0.8)] active:shadow-none active:translate-x-[1px] active:translate-y-[1px] rounded-none shrink-0"
          >
            <UsersIcon className="size-3.5" />
            Select {group.members.length + 1}
          </button>
        )}
      </PersonRow>
      <ul className="flex flex-col gap-1 px-4 pb-3 ml-7">
        {group.members.map(({ cluster: m, sim }) => (
          <PersonRow
            key={m.id}
            person={m}
            mergeMode={mergeMode}
            selected={selected.has(m.id)}
            onToggle={onToggle}
            similar={0}
            simLabel={formatPercent(sim)}
            onDelete={onDelete}
          />
        ))}
      </ul>
    </li>
  );
}

export const PeoplePage = () => {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);

  const { data, isLoading, isFetching, error } = useListFacesQuery({
    limit: PAGE_SIZE,
    offset,
  });
  const [deleteFace, { isLoading: deleting }] = useDeleteFaceMutation();
  const [mergeFaces, { isLoading: merging }] = useMergeFacesMutation();
  const [deleteEmptyFaces, { isLoading: deletingEmpty }] =
    useDeleteEmptyFacesMutation();

  const [mergeMode, setMergeMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<Person | null>(null);
  const [confirmMerge, setConfirmMerge] = useState(false);
  const [confirmDeleteEmpty, setConfirmDeleteEmpty] = useState(false);

  const clusters: FacesListResponse["clusters"] | undefined = data?.clusters;

  const groups = useMemo(() => data?.groups ?? [], [data]);

  const groupIds = useMemo(() => {
    const ids = new Set<string>();
    for (const g of groups) {
      ids.add(g.rep.id);
      for (const m of g.members) ids.add(m.cluster.id);
    }
    return ids;
  }, [groups]);

  const restClusters = useMemo(
    () => (clusters ?? []).filter((c) => !groupIds.has(c.id)),
    [clusters, groupIds],
  );

  const rows =
    clusters && clusters.length > 0
      ? mergeMode
        ? restClusters.map((c) => ({ cluster: c, similar: 0 }))
        : collapseDuplicates(restClusters)
      : [];

  const shownCount =
    rows.length + groups.reduce((sum, g) => sum + 1 + g.members.length, 0);

  const hasMore = data ? data.clusters.length < data.rest_total : false;

  const loadMore = useCallback(() => {
    if (!isFetching && hasMore && data) {
      setOffset(data.clusters.length);
    }
  }, [isFetching, hasMore, data]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { threshold: 0.1 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  const deleteTargets: Person[] = useMemo(() => {
    if (!deleteTarget) return [];
    if (deleteTarget.is_named && deleteTarget.name !== null) {
      // Deleting a collapsed (duplicate) person removes every cluster with the same name.
      const allClusters = clusters ?? [];
      const sameName = allClusters.filter(
        (c) => c.name === deleteTarget.name,
      );
      if (sameName.length > 1) return sameName;
    }
    return [deleteTarget];
  }, [deleteTarget, clusters]);

  const deleteSamples = useMemo(
    () => deleteTargets.reduce((sum, c) => sum + c.sample_count, 0),
    [deleteTargets],
  );
  const deleteStreams = useMemo(
    () =>
      new Set(
        deleteTargets.flatMap((c) => (c.videos ?? []).map((v) => v.stream_id)),
      ).size,
    [deleteTargets],
  );

  const sortedSelected = useMemo(
    () => [...selected].sort(),
    [selected],
  );

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectGroupAll = (group: SimilarityGroup<Person>) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.add(group.rep.id);
      for (const m of group.members) next.add(m.cluster.id);
      return next;
    });
  };

  const runDelete = async () => {
    if (!deleteTarget) return;
    try {
      for (const c of deleteTargets) {
        await deleteFace(c.id).unwrap();
      }
      toast.success("Person deleted");
      setDeleteTarget(null);
      setOffset(0);
    } catch (err) {
      const detail = (err as { data?: { detail?: string } } | undefined)?.data
        ?.detail;
      toast.error(detail ? `Failed: ${detail}` : "Failed to delete person");
    }
  };

  const runMerge = async () => {
    if (sortedSelected.length < 2) return;
    try {
      const res = await mergeFaces({
        cluster_ids: sortedSelected,
      }).unwrap();
      toast.success(
        `Merged into ${res.cluster.is_named ? res.cluster.name : "person"}`,
      );
      setSelected(new Set());
      setConfirmMerge(false);
      setMergeMode(false);
      setOffset(0);
    } catch (err) {
      const detail = (err as { data?: { detail?: string } } | undefined)?.data
        ?.detail;
      toast.error(detail ? `Failed: ${detail}` : "Failed to merge people");
    }
  };

  const runDeleteEmpty = async () => {
    try {
      const res = await deleteEmptyFaces().unwrap();
      toast.success(
        `Deleted ${res.deleted} empty ${res.deleted === 1 ? "person" : "persons"}`,
      );
      setConfirmDeleteEmpty(false);
      setOffset(0);
    } catch (err) {
      const detail = (err as { data?: { detail?: string } } | undefined)?.data
        ?.detail;
      toast.error(
        detail
          ? `Failed: ${detail}`
          : "Failed to delete empty persons",
      );
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2 className="text-2xl font-bold uppercase tracking-tighter select-none cursor-default">
          People
        </h2>
        <div className="flex items-center gap-2">
          {data?.total !== undefined && (
            <span className="text-[10px] uppercase font-bold text-muted-foreground">
              {data.total} cluster{data.total === 1 ? "" : "s"} · {shownCount}{" "}
              shown
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              setMergeMode((m) => !m);
              setSelected(new Set());
            }}
            aria-label={mergeMode ? "Exit merge mode" : "Merge mode"}
            className="inline-flex items-center gap-2 border-2 border-black bg-card text-card-foreground hover:bg-accent px-3 py-1.5 text-[10px] uppercase font-bold shadow-[2px_2px_0_0_rgba(0,0,0,0.8)] active:shadow-none active:translate-x-[1px] active:translate-y-[1px] rounded-none"
          >
            <Merge className="size-3.5" />
            {mergeMode ? "Cancel" : "Merge"}
          </button>
        </div>
      </div>

      {data && data.empty_count > 0 && (
        <div className="flex flex-wrap items-center gap-3 mb-4 border-2 border-dashed border-muted-foreground/50 bg-card px-4 py-3 rounded-none">
          <span className="text-[10px] uppercase font-bold text-muted-foreground">
            {data.empty_count} empty person{" "}
            {data.empty_count === 1 ? "hidden" : "s hidden"} — 0 samples, 0
            videos
          </span>
          <button
            type="button"
            disabled={deletingEmpty}
            onClick={() => setConfirmDeleteEmpty(true)}
            className={pixelBtnDestructive}
          >
            <Delete className="size-3.5" />
            {deletingEmpty
              ? "Deleting..."
              : `Delete ${data.empty_count} empty ${data.empty_count === 1 ? "person" : "persons"}`}
          </button>
        </div>
      )}

      {mergeMode && (
        <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 mb-4 px-2 py-2 bg-card border-4 border-foreground/20 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
          <span className="text-[10px] uppercase font-bold text-muted-foreground">
            {sortedSelected.length} selected
          </span>
          <button
            type="button"
            disabled={sortedSelected.length < 2 || merging}
            onClick={() => setConfirmMerge(true)}
            aria-label="Merge selected people"
            className={pixelBtn}
          >
            <Merge className="size-3.5" />
            {merging ? "Merging..." : `Merge ${sortedSelected.length}`}
          </button>
        </div>
      )}

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

      {data && data.clusters.length === 0 && groups.length === 0 && (
        <p className="text-center text-muted-foreground text-sm uppercase font-bold py-12">
          No faces detected yet
        </p>
      )}

      {groups.length > 0 && (
        <div className="mb-6">
          <h3 className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-2">
            Similar faces (similarity ≥ {formatPercent(SIMILARITY_THRESHOLD)}) —
            likely duplicates
          </h3>
          <ul className="flex flex-col gap-3">
            {groups.map((g) => (
              <SimilarGroupCard
                key={g.rep.id}
                group={g}
                mergeMode={mergeMode}
                selected={selected}
                onToggle={toggle}
                onDelete={setDeleteTarget}
                onSelectAll={selectGroupAll}
              />
            ))}
          </ul>
        </div>
      )}

      {rows.length > 0 && (
        <ul className="flex flex-col gap-2">
          {rows.map(({ cluster: c, similar }) => (
            <PersonRow
              key={c.id}
              person={c}
              mergeMode={mergeMode}
              selected={selected.has(c.id)}
              onToggle={toggle}
              similar={similar}
              onDelete={setDeleteTarget}
            />
          ))}
        </ul>
      )}

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="border-4 border-primary shadow-[8px_8px_0_0_rgba(0,0,0,1)] rounded-none max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm uppercase tracking-wider">
              Delete person?
            </DialogTitle>
            <DialogDescription className="text-xs uppercase tracking-wider">
              This will remove {deleteSamples} sample
              {deleteSamples === 1 ? "" : "s"} from {deleteStreams} stream
              {deleteStreams === 1 ? "" : "s"} and allow re-detection.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              className={pixelBtnOutline}
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </button>
            <button
              type="button"
              className={pixelBtnDestructive}
              disabled={deleting}
              onClick={() => void runDelete()}
            >
              {deleting ? "Deleting..." : "Delete"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmMerge} onOpenChange={setConfirmMerge}>
        <DialogContent className="border-4 border-primary shadow-[8px_8px_0_0_rgba(0,0,0,1)] rounded-none max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm uppercase tracking-wider">
              Merge {sortedSelected.length} people?
            </DialogTitle>
            <DialogDescription className="text-xs uppercase tracking-wider">
              All face samples will be moved into one cluster. The merged person
              keeps the name of the first selected named person. This cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              className={pixelBtnOutline}
              onClick={() => setConfirmMerge(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className={pixelBtn}
              disabled={merging}
              onClick={() => void runMerge()}
            >
              {merging ? "Merging..." : "Merge"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    <Dialog open={confirmDeleteEmpty} onOpenChange={setConfirmDeleteEmpty}>
        <DialogContent className="border-4 border-primary shadow-[8px_8px_0_0_rgba(0,0,0,1)] rounded-none max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm uppercase tracking-wider">
              Delete {data?.empty_count ?? 0} empty{" "}
              {(data?.empty_count ?? 0) === 1 ? "person" : "persons"}?
            </DialogTitle>
            <DialogDescription className="text-xs uppercase tracking-wider">
              These clusters have no face samples attached — nothing is
              re-detected and no stream is affected. The action is immediate
              and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              className={pixelBtnOutline}
              onClick={() => setConfirmDeleteEmpty(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className={pixelBtnDestructive}
              disabled={deletingEmpty}
              onClick={() => void runDeleteEmpty()}
            >
              {deletingEmpty ? "Deleting..." : "Delete"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sentinel for IntersectionObserver */}
      <div ref={sentinelRef} className="h-1" />

      {isFetching && !isLoading && data && data.clusters.length > 0 && (
        <div className="flex justify-center py-6">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
};