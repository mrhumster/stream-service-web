import { useState } from "react"
import { Link } from "react-router-dom"
import { Image } from "lucide-react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card"
import { MarqueeTitle } from "@/components/marquee-title"
import { cn } from "@/lib/utils"
import {
  defaultStatus,
  formatDate,
  hasThumbnail,
  statusConfig,
  thumbnailUrl,
} from "@/lib/stream-format"
import type { StreamResponse } from "@/types/stream.types"

export function StreamCard({ stream }: { stream: StreamResponse }) {
  const status = statusConfig[stream.status] ?? defaultStatus
  const [thumbnailError, setThumbnailError] = useState(false)
  const showThumbnail = hasThumbnail(stream.status) && !thumbnailError

  return (
    <Link to={`/streams/${stream.id}`} className="block">
    <Card className="rounded-none border-4 border-foreground/20 shadow-[4px_4px_0_0_rgba(0,0,0,0.3)] gap-4 py-0 overflow-hidden cursor-pointer transition-colors hover:border-primary">
      <div className="aspect-video bg-muted border-b-2 border-foreground/10">
        {showThumbnail ? (
          <img
            src={thumbnailUrl(stream.id)}
            alt={stream.title}
            loading="lazy"
            className="h-full w-full object-cover"
            onError={() => setThumbnailError(true)}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2">
            <Image className="size-8 text-muted-foreground/60" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">
              No Preview
            </span>
          </div>
        )}
      </div>
      <CardHeader className="border-b-2 border-foreground/10 bg-muted/30 px-4 py-3">
        <CardTitle className="text-sm uppercase tracking-tight min-w-0">
          <MarqueeTitle text={stream.title} />
        </CardTitle>
        <CardDescription className="text-xs line-clamp-2">
          {stream.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="px-4 py-0">
        <div className="flex items-center gap-2 text-[10px] uppercase text-muted-foreground">
          <span className="font-bold">Visibility:</span>
          <span>{stream.visibility}</span>
        </div>

        {stream.tags && stream.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {stream.tags.map((tag) => (
              <span
                key={tag}
                className="bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-bold uppercase"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex items-center justify-between border-t-2 border-foreground/10 px-4 py-2 text-[10px] text-muted-foreground">
        <span>{formatDate(stream.created_at)}</span>
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
    </Link>
  )
}
