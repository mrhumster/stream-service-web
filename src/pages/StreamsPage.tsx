import { StreamCard } from "@/components/stream-card"
import { mockStreams } from "@/data/streams"

export const StreamsPage = () => {
  return (
    <div>
      <h2 className="text-2xl font-bold uppercase tracking-tighter mb-6">
        Streams
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockStreams.map((stream) => (
          <StreamCard key={stream.id} stream={stream} />
        ))}
      </div>
    </div>
  )
}
