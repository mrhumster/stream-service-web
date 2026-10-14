import type { ImgHTMLAttributes } from "react";

interface StreamThumbnailProps extends ImgHTMLAttributes<HTMLImageElement> {
  /** View rotation from `stream.metadata.rotation` (0/90/180/270). */
  rotation?: number | null;
  /**
   * Container width/height. Only matters for 90/270 in a non-square box: the
   * rotated image no longer covers it, so it is scaled up to fill.
   */
  containerAspect?: number;
}

/**
 * Thumbnail of a stream, honouring its view rotation.
 *
 * `metadata.rotation` is a pure client-side view setting (the player applies it
 * with CSS `rotate`), while the stored thumbnail is a raw frame — so portrait
 * videos looked sideways in the cards. Rotating here fixes that.
 *
 * Uses the `transform` property on purpose: Tailwind v4's `scale-*` utilities
 * set the independent `scale` property, so a caller's `group-hover:scale-105`
 * still composes instead of being overridden.
 */
export function StreamThumbnail({
  rotation,
  containerAspect = 1,
  style,
  ...imgProps
}: StreamThumbnailProps) {
  const deg = (((Math.round(rotation ?? 0) % 360) + 360) % 360);
  const scale = deg % 180 === 0 ? 1 : Math.max(containerAspect, 1 / containerAspect);
  const transform =
    deg === 0
      ? undefined
      : scale === 1
        ? `rotate(${deg}deg)`
        : `rotate(${deg}deg) scale(${scale})`;

  return <img {...imgProps} style={transform ? { ...style, transform } : style} />;
}
