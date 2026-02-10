import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { StreamResponse, StreamStatus } from "@/types/stream.types"

const statusConfig: Record<StreamStatus, { label: string; className: string }> = {
  draft: { label: "DRAFT", className: "bg-muted text-muted-foreground" },
  processing: { label: "PROCESSING", className: "bg-yellow-500 text-black" },
  ready: { label: "READY", className: "bg-blue-500 text-white" },
  published: { label: "PUBLISHED", className: "bg-green-600 text-white" },
  error: { label: "ERROR", className: "bg-red-600 text-white" },
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export function StreamCard({ stream }: { stream: StreamResponse }) {
  const status = statusConfig[stream.status]

  return (
    <Card className="rounded-none border-4 border-foreground/20 shadow-[4px_4px_0_0_rgba(0,0,0,0.3)] gap-4 py-0 overflow-hidden">
      <CardHeader className="border-b-2 border-foreground/10 bg-muted/30 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm uppercase tracking-tight truncate">
            {stream.title}
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
        <CardDescription className="text-xs line-clamp-2">
          {stream.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="px-4 py-0">
        <div className="flex items-center gap-2 text-[10px] uppercase text-muted-foreground">
          <span className="font-bold">Visibility:</span>
          <span>{stream.visibility}</span>
        </div>

        {stream.tags.length > 0 && (
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

      <CardFooter className="border-t-2 border-foreground/10 px-4 py-2 text-[10px] text-muted-foreground">
        <span>{formatDate(stream.created_at)}</span>
      </CardFooter>
    </Card>
  )
}
