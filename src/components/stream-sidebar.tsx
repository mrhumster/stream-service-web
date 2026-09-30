import { useRef, useEffect, useCallback, useState } from "react"
import { Link } from "react-router-dom"
import { Image, Loader2 } from "lucide-react"
import { useListStreamsSidebarQuery } from "@/services/streams"
import {
  formatDuration,
  hasThumbnail,
  thumbnailUrl,
} from "@/lib/stream-format"
import type { StreamResponse } from "@/types/stream.types"

const SIDEBAR_PAGE_SIZE = 8

function SidebarSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-video bg-muted rounded-none" />
          <div className="mt-2 h-3 bg-muted rounded-none w-3/4" />
        </div>
      ))}
    </div>
  )
}

function SidebarCard({ stream }: { stream: StreamResponse }) {
  const [thumbnailError, setThumbnailError] = useState(false)
  const showThumbnail = hasThumbnail(stream.status) && !thumbnailError

  return (
    <Link
      to={`/streams/${stream.id}`}
      className="group block border-2 border-foreground/10 bg-muted/20 overflow-hidden cursor-pointer transition-colors hover:border-primary"
    >
      <div className="relative aspect-video bg-muted overflow-hidden">
        {showThumbnail ? (
          <>
            <img
              src={thumbnailUrl(stream.id)}
              alt={stream.title}
              loading="lazy"
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
              onError={() => setThumbnailError(true)}
            />
            {stream.metadata?.duration != null &&
              stream.metadata.duration > 0 && (
                <span className="absolute bottom-1 right-1 z-10 bg-black/80 px-1 py-0.5 text-[7px] font-['Press_Start_2P'] text-white uppercase tracking-wider">
                  {formatDuration(stream.metadata.duration)}
                </span>
              )}
          </>
        ) : (
          <div className="flex h-full items-center justify-center">
            <Image className="size-6 text-muted-foreground/60" />
          </div>
        )}
      </div>
      <div className="px-2 py-1.5">
        <p className="text-xs font-bold uppercase tracking-tight truncate">
          {stream.title}
        </p>
      </div>
    </Link>
  )
}

interface StreamSidebarProps {
  excludeId: string
}

export function StreamSidebar({ excludeId }: StreamSidebarProps) {
  const [offset, setOffset] = useState(0)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const { data, isLoading, isFetching } = useListStreamsSidebarQuery({
    limit: SIDEBAR_PAGE_SIZE,
    offset,
  })

  const filteredItems =
    data?.items.filter((s) => s.id !== excludeId) ?? []

  const hasMore = data ? data.items.length < data.total : true

  const loadMore = useCallback(() => {
    if (!isFetching && hasMore && data) {
      setOffset(data.items.length)
    }
  }, [isFetching, hasMore, data])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore()
      },
      { threshold: 0.1 },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [loadMore])

  if (isLoading) {
    return (
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider mb-3">
          More Streams
        </h3>
        <SidebarSkeleton />
      </div>
    )
  }

  if (filteredItems.length === 0) return null

  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-wider mb-3">
        More Streams
      </h3>
      <div className="flex flex-col gap-3">
        {filteredItems.map((stream) => (
          <SidebarCard key={stream.id} stream={stream} />
        ))}
      </div>

      <div ref={sentinelRef} className="h-1" />

      {isFetching && (
        <div className="flex justify-center py-4">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  )
}
