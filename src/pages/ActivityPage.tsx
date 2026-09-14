import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, CheckCheck, Sparkles } from "lucide-react";
import {
  useGetEventsQuery,
  useGetUnreadCountQuery,
  useMarkEventReadMutation,
  useMarkAllEventsReadMutation,
} from "@/services/events";
import { cn } from "@/lib/utils";
import type { ActivityEvent } from "@/types/event.types";

const EVENT_LABELS: Record<string, { label: string; streamLink: boolean }> = {
  "stream.created": { label: "Stream created", streamLink: true },
  "stream.upload.started": { label: "Upload started", streamLink: true },
  "stream.upload.completed": { label: "Upload completed", streamLink: true },
  "stream.transcode.started": { label: "Transcoding started", streamLink: true },
  "stream.transcode.finish": { label: "Transcoding finished", streamLink: true },
  "stream.transcode.failed": { label: "Transcoding failed", streamLink: true },
  "stream.ready": { label: "Stream is ready", streamLink: true },
  "stream.published": { label: "Stream published", streamLink: true },
  "stream.unpublished": { label: "Stream unpublished", streamLink: true },
  "stream.deleted": { label: "Stream deleted", streamLink: false },
  "stream.reprocessed": { label: "Stream reprocessed", streamLink: true },
  "user.registered": { label: "Account registered", streamLink: false },
  "user.login": { label: "You signed in", streamLink: false },
  "user.email.verified": { label: "Email verified", streamLink: false },
};

function eventVisual(entry: ActivityEvent) {
  const meta = EVENT_LABELS[entry.event_type];
  return meta ?? { label: entry.event_type, streamLink: false };
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

export const ActivityPage = () => {
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  const { data, isLoading, error } = useGetEventsQuery({ limit: 50, cursor });
  const { data: unread } = useGetUnreadCountQuery();
  const [markEventRead, { isLoading: marking }] = useMarkEventReadMutation();
  const [markAllRead, { isLoading: markingAll }] = useMarkAllEventsReadMutation();

  const unreadCount = unread?.count ?? 0;

  const handleRead = async (entry: ActivityEvent) => {
    if (entry.read_at) return;
    await markEventRead(entry.id);
  };

  const handleLoadMore = () => {
    if (data?.next_cursor) setCursor(data.next_cursor);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2 className="text-2xl font-bold uppercase tracking-tighter select-none cursor-default">
          Activity
        </h2>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => markAllRead()}
              disabled={markingAll}
              className="inline-flex items-center gap-2 bg-muted text-muted-foreground hover:bg-accent hover:text-foreground border-2 border-black px-3 py-1.5 text-[10px] uppercase font-bold shadow-[2px_2px_0_0_rgba(0,0,0,0.2)] active:shadow-none active:translate-x-[1px] active:translate-y-[1px] disabled:opacity-50"
            >
              <CheckCheck className="size-3.5" />
              Mark all read
            </button>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <p className="text-center text-destructive text-sm uppercase font-bold py-12">
          Failed to load activity
        </p>
      )}

      {data && data.events.length === 0 && (
        <p className="text-center text-muted-foreground text-sm uppercase font-bold py-12">
          No activity yet
        </p>
      )}

      {data && data.events.length > 0 && (
        <ul className="flex flex-col gap-2">
          {data.events.map((entry) => {
            const meta = eventVisual(entry);
            const isRead = Boolean(entry.read_at);
            const title =
              (entry.payload?.title as string | undefined) ?? undefined;
            return (
              <li key={entry.id}>
                <button
                  type="button"
                  onClick={() => handleRead(entry)}
                  disabled={marking}
                  className={cn(
                    "w-full text-left flex items-center gap-3 border-2 px-4 py-3 transition-colors",
                    isRead
                      ? "border-foreground/10 bg-background text-muted-foreground"
                      : "border-primary bg-card text-foreground shadow-[4px_4px_0_0_rgba(0,0,0,0.8)]",
                  )}
                >
                  <span
                    className={cn(
                      "size-2 shrink-0",
                      isRead ? "bg-transparent" : "bg-primary",
                    )}
                  />
                  <span className="flex-1 min-w-0">
                    <span className="block text-[11px] uppercase font-bold tracking-tight truncate">
                      {meta.label}
                      {title ? (
                        <span className="text-muted-foreground">
                          {" — "}
                          {title}
                        </span>
                      ) : null}
                    </span>
                    <span className="block text-[10px] uppercase text-muted-foreground mt-0.5">
                      {formatTime(entry.created_at)}
                    </span>
                  </span>
                  {!isRead && (
                    <span className="text-[9px] uppercase font-bold text-primary border border-primary px-1.5 py-0.5">
                      New
                    </span>
                  )}
                  {meta.streamLink && entry.stream_id ? (
                    <Link
                      to={`/streams/${entry.stream_id}`}
                      className="text-[9px] uppercase font-bold text-muted-foreground hover:text-primary underline underline-offset-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      open
                    </Link>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {data?.next_cursor && (
        <div className="flex justify-center pt-6">
          <button
            type="button"
            onClick={handleLoadMore}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 border-4 border-black px-5 py-2 text-[10px] uppercase font-bold shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 rounded-none"
          >
            <Sparkles className="size-3.5" />
            Load more
          </button>
        </div>
      )}
    </div>
  );
};