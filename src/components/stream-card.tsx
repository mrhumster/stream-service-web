import { useEffect, useRef, useState } from "react"
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { StreamResponse, StreamStatus } from "@/types/stream.types"

export const statusConfig: Record<StreamStatus, { label: string; className: string }> = {
  draft: { label: "DRAFT", className: "bg-muted text-muted-foreground" },
  processing: { label: "PROCESSING", className: "bg-yellow-500 text-black" },
  ready: { label: "READY", className: "bg-blue-500 text-white" },
  published: { label: "PUBLISHED", className: "bg-green-600 text-white" },
  error: { label: "ERROR", className: "bg-red-600 text-white" },
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export const defaultStatus = { label: "UNKNOWN", className: "bg-muted text-muted-foreground" }

export function StreamCard({ stream }: { stream: StreamResponse }) {
  const status = statusConfig[stream.status] ?? defaultStatus
  const titleRef = useRef<HTMLSpanElement>(null)
  const [overflows, setOverflows] = useState(false)
  const [distance, setDistance] = useState(0)

  useEffect(() => {
    const el = titleRef.current
    if (!el) return

    const update = () => {
      const scrollWidth = el.scrollWidth
      const clientWidth = el.clientWidth
      setOverflows(scrollWidth > clientWidth)
      setDistance(Math.max(scrollWidth - clientWidth, 0))
    }

    update()

    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [stream.title])

  return (
    <Link to={`/streams/${stream.id}`} className="block">
    <Card className="rounded-none border-4 border-foreground/20 shadow-[4px_4px_0_0_rgba(0,0,0,0.3)] gap-4 py-0 overflow-hidden cursor-pointer transition-colors hover:border-primary">
      <div className="aspect-video flex flex-col items-center justify-center gap-2 bg-muted border-b-2 border-foreground/10">
        <Image className="size-8 text-muted-foreground/60" />
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">
          No Preview
        </span>
      </div>
      <CardHeader className="border-b-2 border-foreground/10 bg-muted/30 px-4 py-3">
        <CardTitle className="text-sm uppercase tracking-tight min-w-0">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="block overflow-hidden">
                  <span
                    ref={titleRef}
                    className={cn(
                      "inline-block whitespace-nowrap max-w-full",
                      overflows && "animate-marquee",
                    )}
                    style={
                      overflows
                        ? ({ "--marquee-distance": `${distance}px` } as React.CSSProperties)
                        : undefined
                    }
                  >
                    {stream.title}
                  </span>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {stream.title}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
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
