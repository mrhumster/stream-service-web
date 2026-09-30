import { Check, Plus, X } from "lucide-react";
import { formatPercent } from "@/lib/face-similarity";
import type { FrameFace } from "@/hooks/useFrameFaceAssist";

/* Face boxes drawn over the paused frame.

 * The overlay is rendered *inside* the player's main layer — the one that
 * carries `aspectRatio: sourceAspect` and the view rotation — so every box is
 * placed in percentages of that layer and therefore lines up with the video and
 * rotates with it for free. Boxes come back in pixels of the uploaded (possibly
 * downscaled) frame, hence the width/height the server reports. */

const boxStyle =
  "absolute border-2 border-primary shadow-[0_0_0_1px_rgba(0,0,0,0.85)]";

const cardStyle =
  "absolute left-0 top-full mt-1 flex items-center gap-1 whitespace-nowrap border-2 border-black bg-card px-1.5 py-1 text-[9px] font-bold uppercase tracking-wider text-card-foreground shadow-[2px_2px_0_0_rgba(0,0,0,0.8)]";

const iconBtnStyle =
  "flex size-5 items-center justify-center border-2 border-black leading-none transition-transform active:translate-y-px";

const suggestionLabel = (item: FrameFace) => {
  const s = item.face.suggestion;
  if (!s) return "new person";
  const who = s.is_named ? (s.name ?? "person") : `person ${s.id.slice(0, 8)}`;
  return `${who} · ${formatPercent(s.similarity)}`;
};

interface Props {
  faces: FrameFace[];
  frameWidth: number;
  frameHeight: number;
  busyKey: string | null;
  resolvedKey: string | null;
  onAccept: (key: string) => void;
  onReject: (key: string) => void;
}

export const FrameFaceOverlay = ({
  faces,
  frameWidth,
  frameHeight,
  busyKey,
  resolvedKey,
  onAccept,
  onReject,
}: Props) => {
  if (faces.length === 0 || frameWidth <= 0 || frameHeight <= 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      {faces.map((item) => {
        const [x1, y1, x2, y2] = item.bbox;
        const suggestion = item.face.suggestion;
        const resolved = resolvedKey === item.key;
        const busy = busyKey === item.key;

        return (
          <div
            key={item.key}
            className="absolute"
            style={{
              left: `${(x1 / frameWidth) * 100}%`,
              top: `${(y1 / frameHeight) * 100}%`,
              width: `${((x2 - x1) / frameWidth) * 100}%`,
              height: `${((y2 - y1) / frameHeight) * 100}%`,
            }}
          >
            <div
              className={`${boxStyle} h-full w-full ${
                resolved ? "border-green-500" : ""
              }`}
            />

            {resolved || busy ? (
              <span className={cardStyle}>
                {busy ? "saving..." : "done"}
              </span>
            ) : (
              <div className={`${cardStyle} pointer-events-auto`}>
                <span>{suggestionLabel(item)}</span>
                <button
                  type="button"
                  onClick={() => onAccept(item.key)}
                  aria-label={
                    suggestion ? "Confirm this person" : "Create this person"
                  }
                  className={`${iconBtnStyle} bg-green-600 text-white hover:bg-green-500`}
                >
                  {suggestion ? (
                    <Check className="size-3" />
                  ) : (
                    <Plus className="size-3" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => onReject(item.key)}
                  aria-label="Dismiss this face"
                  className={`${iconBtnStyle} bg-card text-card-foreground hover:bg-destructive hover:text-destructive-foreground`}
                >
                  <X className="size-3" />
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

