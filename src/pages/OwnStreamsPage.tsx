import { useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { StreamCard } from "@/components/stream-card";
import { useAuth } from "@/hooks/useAuth";
import { useListOwnStreamsQuery } from "@/services/streams";
import {
  formatDate,
  formatDuration,
  hasThumbnail,
  statusConfig,
  defaultStatus,
  thumbnailUrl,
} from "@/lib/stream-format";
import { cn } from "@/lib/utils";
import { Plus, Loader2, LayoutGrid, List, ChevronUp, ChevronDown, Image } from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import type { StreamResponse } from "@/types/stream.types";

type ViewMode = "grid" | "table";
type SortField = "created_at" | "title" | "status";

function compareStreams(a: StreamResponse, b: StreamResponse, field: SortField): number {
  switch (field) {
    case "created_at":
      return a.created_at.localeCompare(b.created_at);
    case "title":
      return a.title.localeCompare(b.title);
    case "status":
      return a.status.localeCompare(b.status);
    default:
      return 0;
  }
}

function SortIcon({
  field,
  activeField,
  direction,
}: {
  field: SortField;
  activeField: SortField;
  direction: "asc" | "desc";
}) {
  if (activeField !== field) return null;
  return direction === "asc" ? (
    <ChevronUp className="size-3 inline ml-0.5" />
  ) : (
    <ChevronDown className="size-3 inline ml-0.5" />
  );
}

export const OwnStreamsPage = () => {
  const { isAuth } = useAuth();
  const navigate = useNavigate();
  const sentinelRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, isFetching, error } = useListOwnStreamsQuery();

  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sortedItems = useMemo(() => {
    if (!data?.items) return [];
    return [...data.items].sort((a, b) => {
      const cmp = compareStreams(a, b, sortField);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, sortField, sortDir]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2 className="text-2xl font-bold uppercase tracking-tighter select-none cursor-default whitespace-nowrap">
          My Streams
        </h2>
        <div className="flex items-center gap-2">
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
          {sortedItems.map((stream) => (
            <StreamCard key={stream.id} stream={stream} />
          ))}
        </div>
      )}

      {/* Table view */}
      {data && data.items.length > 0 && viewMode === "table" && (
        <Table>
          <TableHeader>
            <TableRow>
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedItems.map((stream) => {
              const status = statusConfig[stream.status] ?? defaultStatus;
              return (
                <TableRow
                  key={stream.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/streams/${stream.id}`)}
                >
                  {/* Thumbnail */}
                  <TableCell className="p-1.5 hidden sm:table-cell">
                    {hasThumbnail(stream.status) ? (
                      <img
                        src={thumbnailUrl(stream.id)}
                        alt=""
                        className="w-10 h-10 object-cover border-2 border-foreground/10"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-muted border-2 border-foreground/10 flex items-center justify-center">
                        <Image className="size-4 text-muted-foreground/60" />
                      </div>
                    )}
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
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      {/* Sentinel for IntersectionObserver */}
      <div ref={sentinelRef} className="h-1" />

      {isFetching && !isLoading && (
        <div className="flex justify-center py-6">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
};
