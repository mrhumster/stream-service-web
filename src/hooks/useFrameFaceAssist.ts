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

/** Frames are downscaled before upload. The detector (SCRFD) rescales the long
 * side to det_size=640 and pads to 640x640 before it looks at anything
 * (scrfd.py:224-235), so pixels past that are pure upload cost: 1280px bought
 * nothing and cost ~200 kB. 720 keeps a little headroom for small faces. */
const MAX_CAPTURE_WIDTH = 720;
const JPEG_QUALITY = 0.75;
/**
 * `requestVideoFrameCallback` only fires when a *new* frame is presented — on a
 * plain pause none ever is, so waiting on it alone left the detection hanging
 * until playback resumed (and the boxes then landed on the wrong picture). We
 * race it against this watchdog: after a seek the callback usually wins and we
 * get the freshly painted frame, on a plain pause the timer wins and the frame
 * on screen is already the one we want.
 */
const CAPTURE_WATCHDOG_MS = 150;
/** scrubbing must not queue a detection per gesture */
const MIN_DETECT_INTERVAL_MS = 700;
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
  const [isScanning, setIsScanning] = useState(false);

  const frameRef = useRef<CapturedFrame | null>(null);
  const lastTRef = useRef<number | null>(null);
  const inFlightRef = useRef(false);
  const lastRequestAtRef = useRef(0);
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const throttleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
      if (inFlightRef.current || !video.paused) return;
      if (lastTRef.current !== null && Math.abs(lastTRef.current - t) < SAME_FRAME_EPSILON) {
        return;
      }
      lastRequestAtRef.current = Date.now();
      inFlightRef.current = true;
      lastTRef.current = t;
      setIsScanning(true);
      const startedAt = performance.now();
      try {
        const captured = await captureFrame(video);
        if (!captured) return;
        const encodedAt = performance.now();
        const res = await detect({ file: captured.blob }).unwrap();
        const answeredAt = performance.now();

        // The picture may have moved on while we waited: a seek or a resume
        // invalidates these boxes, they belong to the frame we just sent.
        if (!video.paused || Math.abs(video.currentTime - t) > SAME_FRAME_EPSILON) {
          return;
        }

        // console.log, not console.debug: DevTools hides Verbose by default, so
        // the timings were invisible in the browser while running fine.
        //
        // The server's own span occasionally measures slightly longer than the
        // client's round trip (~30ms, cause unknown), so anything derived by
        // subtracting the two can come out negative. We print the two raw
        // numbers instead and clamp the difference.
        const server = Math.round(res.took_ms);
        const total = Math.round(answeredAt - startedAt);
        console.log(
          `[face-assist] t=${t.toFixed(2)}s faces=${res.faces.length} ` +
            `capture+encode=${Math.round(encodedAt - startedAt)}ms ` +
            `server=${server}ms ` +
            `outside=${Math.max(0, total - server)}ms ` +
            `total=${total}ms`,
        );

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
        setIsScanning(false);
      }
    },
    [attach, commit, detect, resolveFace, streamId],
  );

  /* Grab the frame once it is actually on screen. requestVideoFrameCallback
   * gives us the freshly painted frame after a seek; the watchdog covers the
   * plain-pause case, where no new frame will ever be presented. */
  const captureWhenPainted = useCallback(
    (video: HTMLVideoElement) => {
      if (watchdogRef.current) clearTimeout(watchdogRef.current);
      let done = false;
      const fire = () => {
        if (done) return;
        done = true;
        if (watchdogRef.current) clearTimeout(watchdogRef.current);
        // Scrubbing fires this faster than the server should be hammered, but
        // dropping the request outright would leave the owner staring at a bare
        // frame. Coalesce instead: one trailing detection for where they
        // stopped.
        const wait =
          MIN_DETECT_INTERVAL_MS - (Date.now() - lastRequestAtRef.current);
        if (wait > 0) {
          if (throttleRef.current) clearTimeout(throttleRef.current);
          throttleRef.current = setTimeout(() => {
            throttleRef.current = null;
            void runDetect(video);
          }, wait);
          return;
        }
        void runDetect(video);
      };
      watchdogRef.current = setTimeout(fire, CAPTURE_WATCHDOG_MS);
      const rvfc = (
        video as HTMLVideoElement & {
          requestVideoFrameCallback?: (cb: () => void) => number;
        }
      ).requestVideoFrameCallback;
      if (typeof rvfc === "function") {
        rvfc.call(video, fire);
      } else if (video.readyState >= 2) {
        // no rvfc and the picture is already there — nothing to wait for
        fire();
      }
    },
    [runDetect],
  );

  const onPause = useCallback(
    (video: HTMLVideoElement) => {
      if (!enabled) return;
      // the old boxes belong to a different frame, they must not linger
      clear();
      lastTRef.current = null;
      if (video.seeking) {
        // the seek has not landed yet; onSeeked will pick this up
        return;
      }
      captureWhenPainted(video);
    },
    [captureWhenPainted, clear, enabled],
  );

  /* Seeking while paused never fires `pause` again, so this is the trigger that
   * keeps the boxes glued to the picture while the owner scrubs. */
  const onSeeked = useCallback(
    (video: HTMLVideoElement) => {
      if (!enabled || !video.paused) return;
      clear();
      lastTRef.current = null;
      captureWhenPainted(video);
    },
    [captureWhenPainted, clear, enabled],
  );

  /* Safety net only: drop boxes whose frame is no longer the one on screen.
   * Deliberately does not trigger a detection — onSeeked already did that. */
  const onTimeCheck = useCallback(
    (video: HTMLVideoElement) => {
      if (!enabled) return;
      const current = frameRef.current;
      if (!current || !video.paused) return;
      if (Math.abs(video.currentTime - current.tSeconds) > SAME_FRAME_EPSILON) {
        clear();
      }
    },
    [clear, enabled],
  );

  const onPlay = useCallback(() => {
    if (watchdogRef.current) clearTimeout(watchdogRef.current);
    // a queued detection must not fire against a moving picture
    if (throttleRef.current) {
      clearTimeout(throttleRef.current);
      throttleRef.current = null;
    }
    clear();
    lastTRef.current = null;
  }, [clear]);

  useEffect(() => {
    clear();
  }, [enabled, streamId, clear]);

  useEffect(
    () => () => {
      if (watchdogRef.current) clearTimeout(watchdogRef.current);
      if (throttleRef.current) clearTimeout(throttleRef.current);
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
    isScanning,
    frame,
    busyKey,
    resolvedKey,
    accept,
    reject,
    clear,
    onPause,
    onSeeked,
    onTimeCheck,
    onPlay,
  };
};

export type { CapturedFrame };
