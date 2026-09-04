import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query/react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  useGetStreamQuery,
  useDeleteStreamMutation,
  usePublishStreamMutation,
  useUnpublishStreamMutation,
} from "@/services/streams";
import { useVideoUrl } from "@/hooks/useVideoUrl";
import {
  statusConfig,
  defaultStatus,
  formatDate,
} from "@/lib/stream-format";
import { useAppSelector } from "@/hooks";
import { cn, getErrorMessage } from "@/lib/utils";
import { ArrowLeft, Lock, PenSquare, Delete, Globe } from "pixelarticons/react";
import { HLSPlayer } from "@/components/hls-player";
import ProgressBar from "@/components/ui/8bit/progress-bar";
import { useAuth } from "@/hooks/useAuth";
import { MarqueeTitle } from "@/components/marquee-title";
import { StreamSidebar } from "@/components/stream-sidebar";

export const StreamPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const authUser = useAppSelector((state) => state.auth.authUser);
  const { token, isInitializing } = useAuth();
  const { data: stream, isLoading, error } = useGetStreamQuery(id!);
  const {
    url: videoUrl,
    isLoading: videoLoading,
    error: videoError,
  } = useVideoUrl(id!);
  const [deleteStream, { isLoading: isDeleting }] = useDeleteStreamMutation();
  const [publishStream, { isLoading: isPublished }] =
    usePublishStreamMutation();
  const [unpublishStream, { isLoading: isUnpublished }] =
    useUnpublishStreamMutation();
  const [confirmAction, setConfirmAction] = useState<
    "publish" | "unpublish" | "delete" | null
  >(null);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [id]);

  const isAccessDenied =
    error && "status" in error && (error as FetchBaseQueryError).status === 403;

  const isReady = stream && stream.status == "ready";
  const isPublish = stream && stream.status == "published";
  const isOwner = authUser && stream && authUser.id === stream.owner_id;
  const isProfileLoading = token && !authUser;

  if (isLoading || isInitializing || isProfileLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="text-sm uppercase tracking-wider text-muted-foreground animate-pulse">
          Loading...
        </span>
      </div>
    );
  }

  if (isAccessDenied) {
    return (
      <div className="max-w-3xl mx-auto flex flex-col items-center gap-4 py-20">
        <Lock className="size-10 text-muted-foreground" />
        <p className="text-sm uppercase tracking-wider text-muted-foreground">
          Access denied. Please contact with author
        </p>
        <Link
          to="/streams"
          className="inline-flex items-center gap-2 text-xs uppercase text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to Streams
        </Link>
      </div>
    );
  }

  if (error || !stream) {
    return (
      <div className="max-w-3xl mx-auto">
        <p className="text-sm uppercase text-destructive mb-4">
          Failed to load stream
        </p>
        <Link
          to="/streams"
          className="inline-flex items-center gap-2 text-xs uppercase text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to Streams
        </Link>
      </div>
    );
  }

  const status = statusConfig[stream.status] ?? defaultStatus;

  return (
    <div className="max-w-6xl mx-auto">
      <Link
        to="/streams"
        className="inline-flex items-center gap-2 text-xs uppercase text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="size-4" />
        Back to Streams
      </Link>

      <h2 className="text-2xl font-bold uppercase tracking-tighter mb-6">
        <MarqueeTitle text={stream.title} />
      </h2>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left column: player + actions + metadata */}
        <div className="flex-1 min-w-0">
          {/* Video Player */}
          {!isReady && !isPublish ? (
            <div className="flex flex-col items-center gap-4 py-20">
              <Lock className="size-10 text-muted-foreground" />
              <p className="text-sm text-center uppercase tracking-wider text-muted-foreground">
                The video is not ready for playback yet. Please wait.
              </p>
              <Link
                to="/streams"
                className="inline-flex items-center gap-2 text-xs uppercase text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="size-4" />
                Back to Streams
              </Link>
              <ProgressBar progress={stream.processing.progress} />
              <p className="uppercase text-zinc-500">{stream.processing.steps}</p>
            </div>
          ) : (
            <Card className="rounded-none border-4 border-foreground/20 shadow-[4px_4px_0_0_rgba(0,0,0,0.3)] mb-6 overflow-hidden">
              <div className="bg-black flex items-center justify-center max-h-[70vh] w-full">
                {videoLoading ? (
                  <span className="text-sm uppercase tracking-wider text-white/50 animate-pulse">
                    Loading video...
                  </span>
                ) : videoError ? (
                  <span className="text-sm uppercase tracking-wider text-red-400">
                    {videoError}
                  </span>
                ) : videoUrl ? (
                  <HLSPlayer src={videoUrl} />
                ) : null}
              </div>
            </Card>
          )}

          {isOwner && (
            <div className="flex items-center gap-2 mb-6">
              <Link
                to={`/streams/${stream.id}/edit`}
                aria-label="Update Stream"
                className="inline-flex items-center justify-center min-w-9 gap-2 bg-primary text-primary-foreground hover:bg-primary/90 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 rounded-none uppercase text-xs h-9 px-3 sm:px-4 font-bold"
              >
                <PenSquare className="size-5" />
                <span className="hidden md:inline">Update Stream</span>
              </Link>
              {isReady && (
                <button
                  disabled={isPublish || isPublished}
                  onClick={() => setConfirmAction("publish")}
                  aria-label="Publish"
                  className="cursor-pointer inline-flex items-center justify-center min-w-9 gap-2 bg-primary text-primary-foreground hover:bg-primary/90 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 rounded-none uppercase text-xs h-9 px-3 sm:px-4 font-bold"
                >
                  <Globe className="size-5" />
                  <span className="hidden md:inline">Publish</span>
                </button>
              )}
              {isPublish && (
                <button
                  disabled={isUnpublished}
                  onClick={() => setConfirmAction("unpublish")}
                  aria-label="Unpublish"
                  className="cursor-pointer inline-flex items-center justify-center min-w-9 gap-2 bg-primary text-primary-foreground hover:bg-primary/90 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 rounded-none uppercase text-xs h-9 px-3 sm:px-4 font-bold"
                >
                  <Globe className="size-5" />
                  <span className="hidden md:inline">Unpublish</span>
                </button>
              )}
              <button
                disabled={isDeleting}
                onClick={() => setConfirmAction("delete")}
                aria-label={isDeleting ? "Deleting..." : "Delete Stream"}
                className="cursor-pointer inline-flex items-center justify-center min-w-9 gap-2 bg-destructive text-destructive-foreground hover:bg-destructive/90 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 rounded-none uppercase text-xs h-9 px-3 sm:px-4 font-bold disabled:opacity-50"
              >
                <Delete className="size-5" />
                <span className="hidden md:inline">
                  {isDeleting ? "Deleting..." : "Delete Stream"}
                </span>
              </button>

              <Dialog
                open={confirmAction !== null}
                onOpenChange={(open) => !open && setConfirmAction(null)}
              >
                <DialogContent className="border-4 border-primary shadow-[8px_8px_0_0_rgba(0,0,0,1)] rounded-none max-w-sm">
                  <DialogHeader>
                    <DialogTitle className="text-sm uppercase tracking-wider">
                      {confirmAction === "publish"
                        ? "Publish stream?"
                        : confirmAction === "unpublish"
                          ? "Unpublish stream?"
                          : "Delete stream?"}
                    </DialogTitle>
                    <DialogDescription className="text-xs uppercase tracking-wider">
                      {confirmAction === "publish"
                        ? "This will make the stream publicly available."
                        : confirmAction === "unpublish"
                          ? "This will make the stream private again."
                          : "This action cannot be undone."}
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setConfirmAction(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant={
                        confirmAction === "delete" ? "destructive" : "default"
                      }
                      disabled={
                        (confirmAction === "publish" && isPublished) ||
                        (confirmAction === "unpublish" && isUnpublished) ||
                        (confirmAction === "delete" && isDeleting)
                      }
                      onClick={async () => {
                        const action = confirmAction;
                        try {
                          if (action === "publish") {
                            await publishStream({ id: stream.id }).unwrap();
                          } else if (action === "unpublish") {
                            await unpublishStream({ id: stream.id }).unwrap();
                          } else if (action === "delete") {
                            await deleteStream(stream.id).unwrap();
                            navigate("/streams");
                          }
                          setConfirmAction(null);
                        } catch (err) {
                          toast.error(getErrorMessage(err));
                        }
                      }}
                    >
                      {confirmAction === "publish"
                        ? isPublished
                          ? "Publishing..."
                          : "Publish"
                        : confirmAction === "unpublish"
                          ? isUnpublished
                            ? "Unpublishing..."
                            : "Unpublish"
                          : isDeleting
                            ? "Deleting..."
                            : "Delete"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {/* Metadata */}
          <Card className="rounded-none border-4 border-foreground/20 shadow-[4px_4px_0_0_rgba(0,0,0,0.3)]">
            <CardHeader className="border-b-2 border-foreground/10 bg-muted/30">
              <CardTitle className="text-sm uppercase tracking-tight">
                Stream Details
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {stream.description && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">
                    Description
                  </span>
                  <p className="text-sm mt-1">{stream.description}</p>
                </div>
              )}

              <div className="flex items-center gap-2 text-[10px] uppercase text-muted-foreground">
                <span className="font-bold">Visibility:</span>
                <span>{stream.visibility}</span>
              </div>

              {stream.tags && stream.tags.length > 0 && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">
                    Tags
                  </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {stream.tags.map((tag) => (
                      <Link
                        key={tag}
                        to={`/streams?tag=${encodeURIComponent(tag)}`}
                        className="bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-bold uppercase hover:bg-primary/20 transition-colors"
                      >
                        {tag}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

            </CardContent>
            <CardFooter className="flex items-center justify-between gap-2 border-t-2 border-foreground/10 px-4 py-2">
              <div className="flex flex-wrap gap-6 text-[10px] uppercase text-muted-foreground">
                <div>
                  <span className="font-bold">Created:</span>{" "}
                  {formatDate(stream.created_at)}
                </div>
                <div>
                  <span className="font-bold">Updated:</span>{" "}
                  {formatDate(stream.updated_at)}
                </div>
                {stream.published_at && (
                  <div>
                    <span className="font-bold">Published:</span>{" "}
                    {formatDate(stream.published_at)}
                  </div>
                )}
              </div>
              <span
                className={cn(
                  "shrink-0 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                  status.className,
                )}
              >
                {status.label}
              </span>
            </CardFooter>
          </Card>
        </div>

        {/* Right column: sidebar */}
        <aside className="hidden lg:block w-80 shrink-0 lg:sticky lg:top-6 lg:self-start">
          <StreamSidebar excludeId={id!} />
        </aside>
      </div>
    </div>
  );
};
