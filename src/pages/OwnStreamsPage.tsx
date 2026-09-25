import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { StreamCard } from "@/components/stream-card";
import { useAuth } from "@/hooks/useAuth";
import {
  useListOwnStreamsQuery,
  useDetectFacesBatchMutation,
} from "@/services/streams";
import { toast } from "sonner";
import {
  formatDate,
  formatDuration,
  hasThumbnail,
  statusConfig,
  defaultStatus,
  thumbnailUrl,
} from "@/lib/stream-format";
import { cn } from "@/lib/utils";
import { Plus, Loader2, LayoutGrid, List, ChevronUp, ChevronDown, Image, Filter, User } from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/8bit/dropdown-menu";
import type { StreamResponse, StreamStatus, StreamSortBy, StreamSortOrder } from "@/types/stream.types";
import { ShareButton } from "@/components/stream/share-button";

type ViewMode = "grid" | "table";

const PAGE_SIZE = 50;

type StatusFilter = StreamStatus | "all";
type FacesFilter = "all" | "detected" | "not_detected";

const STATUS_OPTIONS: StreamStatus[] = ["draft", "processing", "ready", "published", "error"];

function ThumbCell({ stream }: { stream: StreamResponse }) {
  const [broken, setBroken] = useState(false);
  if (!hasThumbnail(stream.status) || broken) {
    return (
      <div className="w-10 h-10 bg-muted border-2 border-foreground/10 flex items-center justify-center">
        <Image className="size-4 text-muted-foreground/60" />
      </div>
    );
  }
  return (
    <img
      src={thumbnailUrl(stream.id)}
      alt=""
      className="w-10 h-10 object-cover border-2 border-foreground/10"
      loading="lazy"
      onError={() => setBroken(true)}
    />
  );
}

function SortIcon({
  field,
  activeField,
  direction,
}: {
  field: StreamSortBy;
  activeField: StreamSortBy;
  direction: StreamSortOrder;
}) {
  if (activeField !== field) return null;
  return direction === "asc" ? (
    <ChevronUp className="size-3 inline ml-0.5" />
  ) : (
    <ChevronDown className="size-3 inline ml-0.5" />
  );
}

function PixelFilterButton({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center gap-1.5 h-9 px-3 border-4 uppercase text-xs font-bold transition-colors",
        className,
      )}
    >
      <Filter className="size-3.5" />
      {label}
    </button>
  );
}

export const OwnStreamsPage = () => {
  const { isAuth } = useAuth();
  const navigate = useNavigate();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);

  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [facesFilter, setFacesFilter] = useState<FacesFilter>("all");
  const [sortField, setSortField] = useState<StreamSortBy>("created_at");
  const [sortDir, setSortDir] = useState<StreamSortOrder>("desc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [detectFacesBatch, { isLoading: isBatchLoading }] =
    useDetectFacesBatchMutation();

  const { data, isLoading, isFetching, error } = useListOwnStreamsQuery({
    limit: PAGE_SIZE,
    offset,
    status: statusFilter === "all" ? undefined : statusFilter,
    faces_detected:
      facesFilter === "all"
        ? undefined
        : facesFilter === "detected",
    sort: sortField,
    order: sortDir,
  });

  const streams = data?.items ?? [];

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const allSelected =
        streams.length > 0 && streams.every((s) => prev.has(s.id));
      if (allSelected) return new Set();
      return new Set(streams.map((s) => s.id));
    });
  };

  const selectedStreams = streams.filter((s) => selectedIds.has(s.id));
  const eligibleIds = selectedStreams
    .filter((s) => !s.faces_detected)
    .map((s) => s.id);

  const clearSelection = () => setSelectedIds(new Set());

  const handleDetectFacesBatch = async () => {
    if (eligibleIds.length === 0) return;
    try {
      const res = await detectFacesBatch({ ids: eligibleIds }).unwrap();
      const processed = res.processed.length;
      toast.success(
        `Face detection started for ${processed} stream${processed === 1 ? "" : "s"}`,
      );
      clearSelection();
    } catch {
      toast.error("Failed to start face detection");
    }
  };

  const hasMore = data ? data.items.length < data.total : false;

  const loadMore = useCallback(() => {
    if (!isFetching && hasMore && data) {
      setOffset(data.items.length);
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

  const handleSort = (field: StreamSortBy) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
    setOffset(0);
  };

  const applyStatusFilter = (status: StatusFilter) => {
    setStatusFilter(status);
    setOffset(0);
  };

  const applyFacesFilter = (faces: FacesFilter) => {
    setFacesFilter(faces);
    setOffset(0);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2 className="text-2xl font-bold uppercase tracking-tighter select-none cursor-default whitespace-nowrap">
          My Streams
        </h2>
        <div className="flex items-center gap-2">
          {/* Status filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div>
                <PixelFilterButton
                  className={cn(
                    statusFilter === "all"
                      ? "bg-muted text-muted-foreground hover:bg-muted/80"
                      : "bg-primary text-primary-foreground",
                  )}
                  label={
                    statusFilter === "all"
                      ? "All statuses"
                      : (statusConfig[statusFilter]?.label ?? statusFilter)
                  }
                />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" font="retro">
              <DropdownMenuLabel>Status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => applyStatusFilter("all")}>
                All statuses
              </DropdownMenuItem>
              {STATUS_OPTIONS.map((status) => (
                <DropdownMenuItem
                  key={status}
                  onClick={() => applyStatusFilter(status)}
                >
                  {statusConfig[status]?.label ?? status}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Faces filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div>
                <PixelFilterButton
                  className={cn(
                    facesFilter === "all"
                      ? "bg-muted text-muted-foreground hover:bg-muted/80"
                      : "bg-primary text-primary-foreground",
                  )}
                  label={
                    facesFilter === "all"
                      ? "All faces"
                      : facesFilter === "detected"
                        ? "Faces detected"
                        : "No faces"
                  }
                />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" font="retro">
              <DropdownMenuLabel>Faces detection</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => applyFacesFilter("all")}>
                All streams
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => applyFacesFilter("detected")}>
                Faces detected
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => applyFacesFilter("not_detected")}>
                No faces
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* View toggle */}
          <div className="flex border-4 border-foreground/20">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={cn(
                "p-1.5 transition-colors",
                viewMode === "table"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
              title="Table view"
            >
              <List className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={cn(
                "p-1.5 transition-colors",
                viewMode === "grid"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
              title="Grid view"
            >
              <LayoutGrid className="size-4" />
            </button>
          </div>

          {isAuth && (
            <Link
              to="/streams/create"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 rounded-none uppercase text-xs h-9 px-4 font-bold"
            >
              <Plus className="size-4" />
              New Stream
            </Link>
          )}
        </div>
      </div>

      {/* Batch toolbar */}
      {selectedIds.size > 0 && data && data.items.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-3 border-4 border-foreground/20 bg-card p-3 shadow-[4px_4px_0_0_rgba(0,0,0,0.3)]">
          <span className="text-xs uppercase font-bold text-muted-foreground">
            {selectedIds.size} selected
            {eligibleIds.length !== selectedIds.size && (
              <>
                {" "}
                · {eligibleIds.length} ready for detection
              </>
            )}
          </span>
          <button
            type="button"
            disabled={eligibleIds.length === 0 || isBatchLoading}
            onClick={handleDetectFacesBatch}
            className={cn(
              "inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 rounded-none uppercase text-xs h-9 px-4 font-bold disabled:opacity-50 disabled:pointer-events-none",
            )}
          >
            {isBatchLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <User className="size-4" />
            )}
            Detect Faces
            {eligibleIds.length > 0 && ` (${eligibleIds.length})`}
          </button>
          <button
            type="button"
            onClick={clearSelection}
            className="inline-flex items-center gap-2 bg-card text-card-foreground hover:bg-accent border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 rounded-none uppercase text-xs h-9 px-4 font-bold"
          >
            Clear
          </button>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-center text-destructive text-sm uppercase font-bold py-12">
          Failed to load streams
        </p>
      )}

      {/* Empty */}
      {data && data.items.length === 0 && (
        <p className="text-center text-muted-foreground text-sm uppercase font-bold py-12">
          No streams yet
        </p>
      )}

      {/* Grid view */}
      {data && data.items.length > 0 && viewMode === "grid" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.items.map((stream) => (
            <StreamCard
              key={stream.id}
              stream={stream}
              selectable
              selected={selectedIds.has(stream.id)}
              onToggle={toggleSelect}
            />
          ))}
        </div>
      )}

      {/* Table view */}
      {data && data.items.length > 0 && viewMode === "table" && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <label className="inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={
                      streams.length > 0 &&
                      streams.every((s) => selectedIds.has(s.id))
                    }
                    onChange={toggleSelectAll}
                    className="size-4 accent-[#ffcc00]"
                  />
                </label>
              </TableHead>
              <TableHead className="w-12 hidden sm:table-cell" />
              <TableHead>
                <button
                  type="button"
                  onClick={() => handleSort("title")}
                  className="inline-flex items-center hover:text-foreground transition-colors"
                >
                  Title <SortIcon field="title" activeField={sortField} direction={sortDir} />
                </button>
              </TableHead>
              <TableHead className="w-28 hidden sm:table-cell">
                <button
                  type="button"
                  onClick={() => handleSort("status")}
                  className="inline-flex items-center hover:text-foreground transition-colors"
                >
                  Status <SortIcon field="status" activeField={sortField} direction={sortDir} />
                </button>
              </TableHead>
              <TableHead className="w-24 hidden sm:table-cell">Visibility</TableHead>
              <TableHead className="w-20 hidden sm:table-cell">Duration</TableHead>
              <TableHead className="w-32">
                <button
                  type="button"
                  onClick={() => handleSort("created_at")}
                  className="inline-flex items-center hover:text-foreground transition-colors"
                >
                  Created <SortIcon field="created_at" activeField={sortField} direction={sortDir} />
                </button>
              </TableHead>
              <TableHead className="w-16 hidden md:table-cell">Link</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((stream) => {
              const status = statusConfig[stream.status] ?? defaultStatus;
              return (
                <TableRow
                  key={stream.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/streams/${stream.id}`)}
                >
                  {/* Select */}
                  <TableCell
                    className="p-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <label className="inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(stream.id)}
                        onChange={() => toggleSelect(stream.id)}
                        className="size-4 accent-[#ffcc00]"
                      />
                    </label>
                  </TableCell>

                  {/* Thumbnail */}
                  <TableCell className="p-1.5 hidden sm:table-cell">
                    <ThumbCell stream={stream} />
                  </TableCell>

                  {/* Title */}
                  <TableCell className="py-2">
                    <span className="text-xs font-bold uppercase tracking-tight truncate block max-w-[120px] sm:max-w-[200px]">
                      {stream.title}
                    </span>
                  </TableCell>

                  {/* Status */}
                  <TableCell className="hidden sm:table-cell">
                    <span
                      className={cn(
                        "inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                        status.className,
                      )}
                    >
                      {status.label}
                    </span>
                  </TableCell>

                  {/* Visibility */}
                  <TableCell className="hidden sm:table-cell">
                    <span className="text-[10px] uppercase text-muted-foreground">
                      {stream.visibility}
                    </span>
                  </TableCell>

                  {/* Duration */}
                  <TableCell className="hidden sm:table-cell">
                    <span className="text-[10px] uppercase text-muted-foreground tabular-nums">
                      {stream.metadata?.duration
                        ? formatDuration(stream.metadata.duration)
                        : "—"}
                    </span>
                  </TableCell>

                  {/* Created */}
                  <TableCell>
                    <span className="text-[10px] uppercase text-muted-foreground">
                      {formatDate(stream.created_at)}
                    </span>
                  </TableCell>

                  {/* Link (share for unlisted) */}
                  <TableCell className="hidden md:table-cell">
                    {stream.visibility === "unlisted" && (
                      <ShareButton iconOnly className="scale-90" />
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      {/* Sentinel for IntersectionObserver */}
      <div ref={sentinelRef} className="h-1" />

      {isFetching && !isLoading && data && data.items.length > 0 && (
        <div className="flex justify-center py-6">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
};
