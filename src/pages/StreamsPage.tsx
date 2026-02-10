import { Link } from "react-router-dom"
import { StreamCard } from "@/components/stream-card"
import { mockStreams } from "@/data/streams"
import { useAuth } from "@/hooks/useAuth"
import { Plus } from "lucide-react"

export const StreamsPage = () => {
  const { isAuth } = useAuth()

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockStreams.map((stream) => (
          <StreamCard key={stream.id} stream={stream} />
        ))}
      </div>
    </div>
  )
}
