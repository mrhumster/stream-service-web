import { useState } from "react";
import { Eye, ThumbsDown, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
  useGetStatsQuery,
  useSetReactionMutation,
} from "@/services/stats";
import type { ReactionKind, StreamStats } from "@/types/stats.types";

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function StatButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      type="button"
      className={`flex items-center gap-1 text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-colors shrink-0 disabled:opacity-60 ${
        active
          ? "text-primary hover:text-primary/80"
          : "text-white/80 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

export function ReactionBar({ streamId }: { streamId: string }) {
  const { isAuth } = useAuth();
  const { data, isLoading, isError } = useGetStatsQuery(streamId);
  const [setReaction, { isLoading: isMutating }] = useSetReactionMutation();
  const [optimist, setOptimist] = useState<StreamStats | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [hintNonce, setHintNonce] = useState(0);

  const stats: StreamStats | null = optimist ?? data ?? null;

  if (isLoading || isError || !stats) return null;

  const active = stats.my_reaction;

  const click = async (kind: ReactionKind) => {
    if (isMutating) return;
    if (!isAuth) {
      setHintNonce((n) => n + 1);
      setHint("Sign in to react");
      return;
    }
    setHint(null);
    const next: ReactionKind = active === kind ? "none" : kind;
    setOptimist({ ...stats, my_reaction: next });
    try {
      await setReaction({ streamId, kind: next }).unwrap();
      setOptimist(null);
    } catch {
      setOptimist(null);
      toast.error("Could not update reaction");
    }
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="flex items-center gap-3 rounded bg-black/60 px-2.5 py-1 backdrop-blur-sm"
    >
      <StatButton label="Views">
        <Eye className="size-3.5 sm:size-4" />
        <span className="tabular-nums">{formatCount(stats.views)}</span>
      </StatButton>

      <span className="h-3 w-px bg-white/25" />

      <StatButton
        label={active === "like" ? "Remove reaction" : "Like"}
        active={active === "like"}
        disabled={isMutating}
        onClick={() => void click("like")}
      >
        <ThumbsUp className="size-3.5 sm:size-4" />
        <span className="tabular-nums">{formatCount(stats.likes)}</span>
      </StatButton>
      <StatButton
        label={active === "dislike" ? "Remove reaction" : "Dislike"}
        active={active === "dislike"}
        disabled={isMutating}
        onClick={() => void click("dislike")}
      >
        <ThumbsDown className="size-3.5 sm:size-4" />
        <span className="tabular-nums">{formatCount(stats.dislikes)}</span>
      </StatButton>

      {hint && (
        <span
          key={hintNonce}
          className="text-[10px] uppercase tracking-wider text-destructive"
        >
          {hint}
        </span>
      )}
    </div>
  );
}