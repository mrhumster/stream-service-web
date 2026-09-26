import { useRef, useEffect, useState, useCallback } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { StreamCard } from "@/components/stream-card"
import { useAuth } from "@/hooks/useAuth"
import { useListStreamsPublicQuery } from "@/services/streams"
import { Plus, Loader2, X, Search } from "lucide-react"

const PAGE_SIZE = 24

export const StreamsPage = () => {
  const { isAuth } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTag = searchParams.get("tag") ?? ""
  const q = searchParams.get("q") ?? ""
  const offset = Number(searchParams.get("offset") ?? "0")
  const sentinelRef = useRef<HTMLDivElement>(null)

  const [debouncedQ, setDebouncedQ] = useState(q)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 400)
    return () => clearTimeout(t)
  }, [q])

  const { data, isLoading, isFetching, error } = useListStreamsPublicQuery({
    limit: PAGE_SIZE,
    offset,
    q: debouncedQ,
  })

  const filteredItems = activeTag
    ? data?.items.filter((s) => s.tags?.some((t) => t === activeTag)) ?? []
    : data?.items ?? []

  const hasMore = data
    ? activeTag
      ? filteredItems.length < data.total
      : data.items.length < data.total
    : true

  const loadMore = useCallback(() => {
    if (!isFetching && hasMore && data) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        next.set("offset", String(data.items.length))
        return next
      })
    }
  }, [isFetching, hasMore, data, setSearchParams])

  const applyQuery = useCallback(
    (value: string) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        if (value.trim()) next.set("q", value)
        else next.delete("q")
        next.delete("offset")
        return next
      })
    },
    [setSearchParams],
  )

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
        <h2 className="text-2xl font-bold uppercase tracking-tighter select-none cursor-default">
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

      <div className="relative mb-6 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={q}
          onChange={(e) => applyQuery(e.target.value)}
          placeholder="Search streams by title or description..."
          className="w-full h-10 bg-card border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] pl-9 pr-9 text-sm outline-none rounded-none focus:border-primary placeholder:text-muted-foreground"
        />
        {q && (
          <button
            onClick={() => applyQuery("")}
            aria-label="Clear search"
            className="absolute right-1 top-1/2 -translate-y-1/2 inline-flex items-center justify-center size-8 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <X className="size-4" />
          </button>
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

      {data && data.items.length === 0 && !isLoading && (
        q.trim() ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-sm uppercase font-bold">
              No streams found for &quot;{q}&quot;
            </p>
            <button
              onClick={() => applyQuery("")}
              className="mt-4 inline-flex items-center gap-2 bg-card text-foreground hover:bg-accent border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 rounded-none uppercase text-xs h-9 px-4 font-bold cursor-pointer"
            >
              <X className="size-4" />
              Clear search
            </button>
          </div>
        ) : (
          <p className="text-center text-muted-foreground text-sm uppercase font-bold py-12">
            No streams yet
          </p>
        )
      )}

      {activeTag && !isLoading && (
        <div className="flex items-center gap-2 mb-4 bg-primary/10 border-2 border-primary/20 px-4 py-2 text-xs uppercase font-bold">
          <span className="text-muted-foreground">Tag:</span>
          <span className="text-primary">#{activeTag}</span>
          <button
            onClick={() => setSearchParams({})}
            className="ml-auto inline-flex items-center gap-1 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
          >
            <X className="size-3" />
            Clear
          </button>
        </div>
      )}

      {data && filteredItems.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((stream) => (
            <StreamCard key={stream.id} stream={stream} showMeta={false} />
          ))}
        </div>
      )}

      {activeTag && !isLoading && filteredItems.length === 0 && data && data.items.length > 0 && (
        <p className="text-center text-muted-foreground text-sm uppercase font-bold py-12">
          No streams with tag #{activeTag}
        </p>
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
