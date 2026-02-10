import { Link, useParams } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useGetStreamQuery } from "@/services/streams"
import { useVideoUrl } from "@/hooks/useVideoUrl"
import { statusConfig, formatDate } from "@/components/stream-card"
import { cn } from "@/lib/utils"
import { ArrowLeft } from "lucide-react"

export const StreamPage = () => {
  const { id } = useParams<{ id: string }>()
  const { data: stream, isLoading, error } = useGetStreamQuery(id!)
  const { url: videoUrl, isLoading: videoLoading, error: videoError } = useVideoUrl(id!)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="text-sm uppercase tracking-wider text-muted-foreground animate-pulse">
          Loading...
        </span>
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

  const status = statusConfig[stream.status]

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
