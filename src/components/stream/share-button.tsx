import { Link } from "pixelarticons/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const base =
  "inline-flex items-center justify-center cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 rounded-none uppercase text-xs h-9 font-bold";

export function ShareButton({
  iconOnly = false,
  className,
}: {
  iconOnly?: boolean;
  className?: string;
}) {
  const handleCopy = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label="Copy link"
      title="Copy link"
      className={cn(base, iconOnly ? "w-9 shrink-0" : "px-3 sm:px-4 gap-2", className)}
    >
      <Link className="size-5" />
      {!iconOnly && <span className="hidden md:inline">Share</span>}
    </button>
  );
}