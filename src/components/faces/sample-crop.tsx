import { useEffect, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { useGetSampleCropQuery } from "@/services/faces";
import { useInView } from "@/hooks/use-in-view";
import { cn } from "@/lib/utils";

interface SampleCropProps {
  clusterId: string;
  streamId: string;
  tSeconds: number;
  selected?: boolean;
  onSelect: () => void;
  lazy?: boolean;
  className?: string;
}

/* One of a person's existing appearances, rebuilt server-side from the sampled
 * frame. Samples without a retrievable face (frame pruned, or an assist
 * occurrence not on a sample boundary) come back 404 and are hidden entirely. */
export const SampleCrop = ({
  clusterId,
  streamId,
  tSeconds,
  selected = false,
  onSelect,
  lazy = true,
  className,
}: SampleCropProps) => {
  const { ref, inView } = useInView<HTMLButtonElement>();

  const { data, isError } = useGetSampleCropQuery(
    { id: clusterId, streamId, tSeconds },
    { skip: !clusterId || (lazy && !inView) },
  );
  const url = useMemo(
    () => (data ? URL.createObjectURL(data) : null),
    [data],
  );

  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);

  if (isError) return null;

  if (lazy && !inView) {
    return (
      <span
        ref={ref}
        className={cn("block aspect-square bg-muted border-2 border-foreground/20", className)}
      />
    );
  }

  return (
    <button
      ref={ref}
      type="button"
      onClick={onSelect}
      disabled={!url}
      className={cn(
        "relative block aspect-square overflow-hidden border-2 bg-muted rounded-none transition-colors",
        selected ? "border-primary" : "border-foreground/20 hover:border-primary",
        className,
      )}
    >
      {url ? (
        <img src={url} alt="" className="size-full object-cover" />
      ) : (
        <span className="flex size-full items-center justify-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </span>
      )}
    </button>
  );
};
