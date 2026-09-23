import { useEffect, useMemo } from "react";
import { Loader2, Users as UsersIcon } from "lucide-react";
import { useGetFaceCropQuery } from "@/services/faces";
import { cn } from "@/lib/utils";

interface FaceCropProps {
  clusterId: string;
  className?: string;
  iconClassName?: string;
  hasCrop?: boolean;
}

export const FaceCrop = ({
  clusterId,
  className,
  iconClassName,
  hasCrop = true,
}: FaceCropProps) => {
  const { data, isLoading, isError } = useGetFaceCropQuery(clusterId, {
    skip: !hasCrop,
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

  if (isLoading) {
    return (
      <span
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
    <img
      src={url}
      alt=""
      className={cn(
        "size-9 shrink-0 object-cover border-2 border-foreground/30 bg-background",
        className,
      )}
    />
  );
};