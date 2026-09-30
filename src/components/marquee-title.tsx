import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface MarqueeTitleProps {
  text: string;
  className?: string;
  titleClassName?: string;
}

export function MarqueeTitle({
  text,
  className,
  titleClassName,
}: MarqueeTitleProps) {
  const titleRef = useRef<HTMLSpanElement>(null);
  const [overflows, setOverflows] = useState(false);
  const [distance, setDistance] = useState(0);

  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;

    const update = () => {
      const scrollWidth = el.scrollWidth;
      const clientWidth = el.clientWidth;
      setOverflows(scrollWidth > clientWidth);
      setDistance(Math.max(scrollWidth - clientWidth, 0));
    };

    update();

    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text]);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn("block overflow-hidden min-w-0", className)}>
            <span
              ref={titleRef}
              className={cn(
                "inline-block whitespace-nowrap max-w-full",
                overflows && "animate-marquee",
                titleClassName,
              )}
              style={
                overflows
                  ? ({ "--marquee-distance": `${distance}px` } as CSSProperties)
                  : undefined
              }
            >
              {text}
            </span>
          </span>
        </TooltipTrigger>
        <TooltipContent>{text}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}