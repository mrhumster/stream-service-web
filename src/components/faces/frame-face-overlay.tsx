import { Check, Plus, X } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { RefObject } from "react";
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

/* The action card is a sibling of the box, positioned by `useLayoutEffect` in
 * pixels of the overlay. Anchoring it to the box with `top-full`/`left-0` broke
 * for boxes near the bottom/right edge (the wrapper has `overflow-hidden`, so
 * the OK/Cancel buttons were clipped and unreachable) and for boxes partially
 * off the left/top edge (negative anchor). Clamping it back inside fixes both. */
const cardStyle =
  "absolute z-30 flex items-center gap-1 whitespace-nowrap border-2 border-black bg-card px-1.5 py-1 text-[9px] font-bold uppercase tracking-wider text-card-foreground shadow-[2px_2px_0_0_rgba(0,0,0,0.8)]";

const iconBtnStyle =
  "flex size-5 items-center justify-center border-2 border-black leading-none transition-transform active:translate-y-px";

/** gap between the box and its card, and the minimum distance to the edges */
const CARD_GAP = 4;
const CARD_PAD = 4;

const suggestionLabel = (item: FrameFace) => {
  const s = item.face.suggestion;
  if (!s) return "new person";
  const who = s.is_named ? (s.name ?? "person") : `person ${s.id.slice(0, 8)}`;
  return `${who} · ${formatPercent(s.similarity)}`;
};

interface FaceMarkerProps {
  item: FrameFace;
  frameWidth: number;
  frameHeight: number;
  busy: boolean;
  resolved: boolean;
  overlayRef: RefObject<HTMLDivElement | null>;
  layoutVersion: number;
  onAccept: (key: string) => void;
  onReject: (key: string) => void;
}

const FaceMarker = ({
  item,
  frameWidth,
  frameHeight,
  busy,
  resolved,
  overlayRef,
  layoutVersion,
  onAccept,
  onReject,
}: FaceMarkerProps) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [x1, y1, x2, y2] = item.bbox;
  const suggestion = item.face.suggestion;

  useLayoutEffect(() => {
    const box = boxRef.current;
    const card = cardRef.current;
    const overlay = overlayRef.current;
    if (!box || !card || !overlay) return;

    const ow = overlay.offsetWidth;
    const oh = overlay.offsetHeight;
    if (ow <= 0 || oh <= 0) return;
    const cw = card.offsetWidth;
    const ch = card.offsetHeight;

    // box metrics are relative to the overlay (its offsetParent) and, unlike
    // getBoundingClientRect, are unaffected by the layer's rotate() transform
    const bx = box.offsetLeft;
    const by = box.offsetTop;
    const bw = box.offsetWidth;
    const bh = box.offsetHeight;

    // below the box by default, flip above when there is no room left
    let top = by + bh + CARD_GAP;
    if (top + ch > oh - CARD_PAD) top = by - CARD_GAP - ch;
    top = Math.max(CARD_PAD, Math.min(top, oh - ch - CARD_PAD));

    // left-aligned with the box, right-aligned when it would run off
    let left = bx;
    if (left + cw > ow - CARD_PAD) left = bx + bw - cw;
    left = Math.max(CARD_PAD, Math.min(left, ow - cw - CARD_PAD));

    card.style.left = `${left}px`;
    card.style.top = `${top}px`;
  }, [overlayRef, layoutVersion, x1, y1, x2, y2, busy, resolved, suggestion]);

  return (
    <>
      <div
        ref={boxRef}
        className="absolute"
        style={{
          left: `${(x1 / frameWidth) * 100}%`,
          top: `${(y1 / frameHeight) * 100}%`,
          width: `${((x2 - x1) / frameWidth) * 100}%`,
          height: `${((y2 - y1) / frameHeight) * 100}%`,
        }}
      >
        <div
          className={`${boxStyle} h-full w-full ${resolved ? "border-green-500" : ""}`}
        />
      </div>

      {resolved || busy ? (
        <div ref={cardRef} className={cardStyle}>
          {busy ? "saving..." : "done"}
        </div>
      ) : (
        <div ref={cardRef} className={`${cardStyle} pointer-events-auto`}>
          <span>{suggestionLabel(item)}</span>
          <button
            type="button"
            onClick={() => onAccept(item.key)}
            aria-label={suggestion ? "Confirm this person" : "Create this person"}
            className={`${iconBtnStyle} bg-green-600 text-white hover:bg-green-500`}
          >
            {suggestion ? <Check className="size-3" /> : <Plus className="size-3" />}
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
    </>
  );
};

export interface FrameFaceOverlayProps {
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
}: FrameFaceOverlayProps) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [layoutVersion, setLayoutVersion] = useState(0);

  useEffect(() => {
    const el = overlayRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setLayoutVersion((v) => v + 1));
    ro.observe(el);
    return () => ro.disconnect();
  }, [faces.length]);

  if (faces.length === 0 || frameWidth <= 0 || frameHeight <= 0) return null;

  return (
    <div ref={overlayRef} className="pointer-events-none absolute inset-0 z-20">
      {faces.map((item) => (
        <FaceMarker
          key={item.key}
          item={item}
          frameWidth={frameWidth}
          frameHeight={frameHeight}
          busy={busyKey === item.key}
          resolved={resolvedKey === item.key}
          overlayRef={overlayRef}
          layoutVersion={layoutVersion}
          onAccept={onAccept}
          onReject={onReject}
        />
      ))}
    </div>
  );
};
