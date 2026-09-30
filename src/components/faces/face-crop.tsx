import { useEffect, useMemo } from "react";
import { Loader2, Users as UsersIcon } from "lucide-react";
import { useGetFaceCropQuery } from "@/services/faces";
import { useInView } from "@/hooks/use-in-view";
import { cn } from "@/lib/utils";

interface FaceCropProps {
  clusterId: string;
  className?: string;
  iconClassName?: string;
  hasCrop?: boolean;
  lazy?: boolean;
}

export const FaceCrop = ({
  clusterId,
  className,
  iconClassName,
  hasCrop = true,
  lazy = true,
}: FaceCropProps) => {
  const { ref, inView } = useInView<HTMLSpanElement>();

  const shouldFetch = hasCrop && (!lazy || inView);
  const { data, isLoading, isError } = useGetFaceCropQuery(clusterId, {
    skip: !shouldFetch,
  });
  const url = useMemo(
    () => (data ? URL.createObjectURL(data) : null),
    [data],
  );

  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);

  if (lazy && !inView) {
    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center size-9 shrink-0 border-2 border-foreground/30 bg-background",
          className,
        )}
      />
    );
  }

  if (isLoading) {
    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center size-9 shrink-0 border-2 border-foreground/30 bg-background",
          className,
        )}
      >
        <Loader2 className={cn("size-5 animate-spin text-muted-foreground", iconClassName)} />
      </span>
    );
  }

  if (!url || isError) {
    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center size-9 shrink-0 border-2 border-foreground/30 bg-background text-primary",
          className,
        )}
      >
        <UsersIcon className={cn("size-5", iconClassName)} />
      </span>
    );
  }

  return (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center size-9 shrink-0",
        className,
      )}
    >
      <img
        src={url}
        alt=""
        className="size-full object-cover border-2 border-foreground/30 bg-background"
      />
    </span>
  );
};