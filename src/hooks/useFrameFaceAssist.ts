import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  useAttachFrameFaceMutation,
  useDetectFrameMutation,
} from "@/services/faces";
import type { DetectedFrameFace } from "@/types/face.types";

/* Interactive face assist: when the owner pauses the player we grab the frame
 * that is on screen, ask faces-service what is in it, and let the user attach
 * each face to a person.
 *
 * The capture works without `crossOrigin` because the player always plays
 * through hls.js/MSE (the <video> src is a blob: URL) — see hls-player.tsx. */

/** Frames are downscaled before upload: the detector resizes to 640x640 anyway,
 * and it keeps the request small. Boxes come back in these pixels. */
const MAX_CAPTURE_WIDTH = 1280;
const JPEG_QUALITY = 0.85;
/** pausing repeatedly (scrubbing) must not queue a request per gesture */
const PAUSE_DEBOUNCE_MS = 600;
/** re-pausing on the same moment is a no-op (the occurrence would dedup anyway) */
const SAME_FRAME_EPSILON = 0.5;
/** how long a confirmed box stays green before it disappears */
const RESOLVED_FLASH_MS = 1600;

export interface FrameFace {
  key: string;
  face: DetectedFrameFace;
  /** bbox in the pixels of the uploaded frame */
  bbox: [number, number, number, number];
}

interface CapturedFrame {
  blob: Blob;
  width: number;
  height: number;
  tSeconds: number;
  faces: FrameFace[];
}

const captureFrame = (
  video: HTMLVideoElement,
): Promise<{ blob: Blob; width: number; height: number } | null> =>
  new Promise((resolve) => {
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh || video.readyState < 2) {
      resolve(null);
      return;
    }
    const scale = Math.min(1, MAX_CAPTURE_WIDTH / vw);
    const width = Math.round(vw * scale);
    const height = Math.round(vh * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      resolve(null);
      return;
    }
    ctx.drawImage(video, 0, 0, width, height);
    canvas.toBlob(
      (blob) => resolve(blob ? { blob, width, height } : null),
      "image/jpeg",
      JPEG_QUALITY,
    );
  });

const personLabel = (cluster: {
  id: string;
  is_named: boolean;
  name: string | null;
}) => (cluster.is_named ? (cluster.name ?? "person") : `person ${cluster.id.slice(0, 8)}`);

const errorDetail = (err: unknown) =>
  (err as { data?: { detail?: string } } | undefined)?.data?.detail;

export const useFrameFaceAssist = ({
  enabled,
  streamId,
}: {
  enabled: boolean;
  streamId: string | undefined;
}) => {
  const [detect, { isLoading: isDetecting }] = useDetectFrameMutation();
  const [attach] = useAttachFrameFaceMutation();
  const [frame, setFrame] = useState<CapturedFrame | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [resolvedKey, setResolvedKey] = useState<string | null>(null);

  const frameRef = useRef<CapturedFrame | null>(null);
  const lastTRef = useRef<number | null>(null);
  const inFlightRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = useCallback(() => {
    frameRef.current = null;
    lastTRef.current = null;
    setFrame(null);
    setBusyKey(null);
    setResolvedKey(null);
  }, []);

  const commit = useCallback((next: CapturedFrame | null) => {
    frameRef.current = next;
    setFrame(next);
  }, []);

  const resolveFace = useCallback(
    (key: string) => {
      if (flashRef.current) clearTimeout(flashRef.current);
      setResolvedKey(key);
      // the box turns green for a moment, then it is gone with the rest
      flashRef.current = setTimeout(() => {
        setResolvedKey(null);
        const current = frameRef.current;
        if (current) {
          commit({
            ...current,
            faces: current.faces.filter((f) => f.key !== key),
          });
        }
      }, RESOLVED_FLASH_MS);
    },
    [commit],
  );

  const runDetect = useCallback(
    async (video: HTMLVideoElement) => {
      const t = video.currentTime;
      if (inFlightRef.current) return;
      if (lastTRef.current !== null && Math.abs(lastTRef.current - t) < SAME_FRAME_EPSILON) {
        return;
      }
      inFlightRef.current = true;
      lastTRef.current = t;
      try {
        const captured = await captureFrame(video);
        if (!captured) return;
        const res = await detect({ file: captured.blob }).unwrap();
        if (res.faces.length === 0) {
          commit(null);
          return;
        }
        const next: CapturedFrame = {
          blob: captured.blob,
          width: res.width,
          height: res.height,
          tSeconds: t,
          faces: res.faces.map((face, index) => ({
            key: `f${index}-${face.bbox[0]}-${face.bbox[1]}`,
            face,
            bbox: face.bbox,
          })),
        };
        commit(next);

        // >= 90% similarity is trusted: attach without asking anything
        const autoIndex = res.faces.findIndex((f) => f.suggestion?.auto === true);
        if (autoIndex >= 0 && streamId) {
          const item = next.faces[autoIndex];
          try {
            const attached = await attach({
              streamId,
              file: captured.blob,
              bbox: item.bbox,
              tSeconds: t,
              clusterId: item.face.suggestion!.id,
            }).unwrap();
            toast.success(`Added frame to ${personLabel(attached.cluster)}`);
            resolveFace(item.key);
          } catch (err) {
            toast.error(errorDetail(err) || "Failed to attach face");
          }
        }
      } catch (err) {
        // 400/401/403 just mean "nothing usable here" — stay silent, the owner
        // can always re-pause. Everything else is worth a toast.
        const status = (err as { status?: number } | undefined)?.status;
        if (status !== 400 && status !== 401 && status !== 403) {
          toast.error(errorDetail(err) || "Face detection failed");
        }
      } finally {
        inFlightRef.current = false;
      }
    },
    [attach, commit, detect, resolveFace, streamId],
  );

  /* `pause` can fire before the seeked frame is actually painted; when the
   * browser offers requestVideoFrameCallback we capture the real frame,
   * otherwise we wait a tick so the decoder has caught up. */
  const onPause = useCallback(
    (video: HTMLVideoElement) => {
      if (!enabled) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      const run = () => void runDetect(video);
      const rvfc = (
        video as HTMLVideoElement & {
          requestVideoFrameCallback?: (cb: () => void) => number;
        }
      ).requestVideoFrameCallback;
      if (typeof rvfc === "function") {
        rvfc.call(video, run);
      } else {
        debounceRef.current = setTimeout(run, PAUSE_DEBOUNCE_MS);
      }
    },
    [enabled, runDetect],
  );

  const onPlay = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    clear();
    lastTRef.current = null;
  }, [clear]);

  useEffect(() => {
    clear();
  }, [enabled, streamId, clear]);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (flashRef.current) clearTimeout(flashRef.current);
    },
    [],
  );

  const accept = useCallback(
    async (key: string) => {
      const current = frameRef.current;
      if (!current || !streamId) return;
      const item = current.faces.find((f) => f.key === key);
      if (!item || busyKey) return;
      setBusyKey(key);
      try {
        const res = await attach({
          streamId,
          file: current.blob,
          bbox: item.bbox,
          tSeconds: current.tSeconds,
          clusterId: item.face.suggestion?.id,
        }).unwrap();
        toast.success(
          res.created
            ? `New person ${personLabel(res.cluster)} created`
            : `Added frame to ${personLabel(res.cluster)}`,
        );
        resolveFace(key);
      } catch (err) {
        toast.error(errorDetail(err) || "Failed to attach face");
      } finally {
        setBusyKey(null);
      }
    },
    [attach, busyKey, resolveFace, streamId],
  );

  const reject = useCallback(
    (key: string) => {
      const current = frameRef.current;
      if (!current) return;
      commit({
        ...current,
        faces: current.faces.filter((f) => f.key !== key),
      });
    },
    [commit],
  );

  return {
    enabled,
    isDetecting,
    frame,
    busyKey,
    resolvedKey,
    accept,
    reject,
    clear,
    onPause,
    onPlay,
  };
};

export type { CapturedFrame };
