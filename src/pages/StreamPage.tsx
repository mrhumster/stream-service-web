import { Link, useParams, useNavigate } from "react-router-dom"
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useGetStreamQuery, useDeleteStreamMutation } from "@/services/streams"
import { useVideoUrl } from "@/hooks/useVideoUrl"
import { statusConfig, defaultStatus, formatDate } from "@/components/stream-card"
import { useAppSelector } from "@/hooks"
import { cn } from "@/lib/utils"
import { ArrowLeft, Lock, Pencil, Trash2 } from "lucide-react"

export const StreamPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const authUser = useAppSelector((state) => state.auth.authUser)
  const { data: stream, isLoading, error } = useGetStreamQuery(id!)
  const { url: videoUrl, isLoading: videoLoading, error: videoError } = useVideoUrl(id!)
  const [deleteStream, { isLoading: isDeleting }] = useDeleteStreamMutation()

  const isAccessDenied =
    error && "status" in error && ((error as FetchBaseQueryError).status === 403)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="text-sm uppercase tracking-wider text-muted-foreground animate-pulse">
          Loading...
        </span>
      </div>
    )
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
    )
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
    )
  }

  const status = statusConfig[stream.status] ?? defaultStatus
  const isOwner = authUser?.id === stream.owner_id

  return (
    <div className="max-w-3xl mx-auto">
      <Link
        to="/streams"
        className="inline-flex items-center gap-2 text-xs uppercase text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="size-4" />
        Back to Streams
      </Link>

      <h2 className="text-2xl font-bold uppercase tracking-tighter mb-6">
        {stream.title}
      </h2>

      {/* Video Player */}
      <Card className="rounded-none border-4 border-foreground/20 shadow-[4px_4px_0_0_rgba(0,0,0,0.3)] mb-6 overflow-hidden">
        <div className="bg-black aspect-video flex items-center justify-center">
          {videoLoading ? (
            <span className="text-sm uppercase tracking-wider text-white/50 animate-pulse">
              Loading video...
            </span>
          ) : videoError ? (
            <span className="text-sm uppercase tracking-wider text-red-400">
              {videoError}
            </span>
          ) : videoUrl ? (
            <video
              src={videoUrl}
              controls
              className="w-full h-full"
            />
          ) : null}
        </div>
      </Card>

      {isOwner && (
        <div className="flex gap-2 mb-6">
          <Link
            to={`/streams/${stream.id}/edit`}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 rounded-none uppercase text-xs h-9 px-4 font-bold"
          >
            <Pencil className="size-3" />
            Update Stream
          </Link>
          <button
            disabled={isDeleting}
            onClick={async () => {
              await deleteStream(stream.id).unwrap()
              navigate("/streams")
            }}
            className="inline-flex items-center gap-2 bg-destructive text-destructive-foreground hover:bg-destructive/90 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 rounded-none uppercase text-xs h-9 px-4 font-bold disabled:opacity-50"
          >
            <Trash2 className="size-3" />
            {isDeleting ? "Deleting..." : "Delete Stream"}
          </button>
        </div>
      )}

      {/* Metadata */}
      <Card className="rounded-none border-4 border-foreground/20 shadow-[4px_4px_0_0_rgba(0,0,0,0.3)]">
        <CardHeader className="border-b-2 border-foreground/10 bg-muted/30">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm uppercase tracking-tight">
              Stream Details
            </CardTitle>
            <span
              className={cn(
                "shrink-0 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                status.className,
              )}
            >
              {status.label}
            </span>
          </div>
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
                  <span
                    key={tag}
                    className="bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-bold uppercase"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-6 text-[10px] uppercase text-muted-foreground border-t-2 border-foreground/10 pt-3">
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
        </CardContent>
      </Card>
    </div>
  )
}
