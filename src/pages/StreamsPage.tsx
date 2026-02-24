import { useState, useRef, useEffect, useCallback } from "react"
import { Link } from "react-router-dom"
import { StreamCard } from "@/components/stream-card"
import { useAuth } from "@/hooks/useAuth"
import { useListStreamsPublicQuery } from "@/services/streams"
import { Plus, Loader2 } from "lucide-react"

const PAGE_SIZE = 9

export const StreamsPage = () => {
  const { isAuth } = useAuth()
  const [offset, setOffset] = useState(0)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const { data, isLoading, isFetching, error } = useListStreamsPublicQuery({
    limit: PAGE_SIZE,
    offset,
  })

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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold uppercase tracking-tighter">
          Streams
        </h2>
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

      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <p className="text-center text-destructive text-sm uppercase font-bold py-12">
          Failed to load streams
        </p>
      )}

      {data && data.items.length === 0 && (
        <p className="text-center text-muted-foreground text-sm uppercase font-bold py-12">
          No streams yet
        </p>
      )}

      {data && data.items.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.items.map((stream) => (
            <StreamCard key={stream.id} stream={stream} />
          ))}
        </div>
      )}

      {/* Sentinel for IntersectionObserver */}
      <div ref={sentinelRef} className="h-1" />

      {isFetching && !isLoading && (
        <div className="flex justify-center py-6">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  )
}
