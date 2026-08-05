import { useCallback, useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { useAuth } from "@/hooks/useAuth";
import { Lock } from "pixelarticons/react";
import {
  Play,
  Pause,
  Maximize2,
  Minimize2,
  Volume1,
  Volume2,
  VolumeX,
  Fullscreen,
  Minimize,
  Keyboard,
  RotateCw,
  RotateCcw,
} from "lucide-react";

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

function VolumeIcon({
  volume,
  muted,
  size = "size-4",
}: {
  volume: number;
  muted: boolean;
  size?: string;
}) {
  if (muted || volume === 0) return <VolumeX className={size} />;
  if (volume < 0.5) return <Volume1 className={size} />;
  return <Volume2 className={size} />;
}

export const HLSPlayer = ({ src }: { src: string }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { isAuth, token, isInitializing } = useAuth();
  const [isForbidden, setIsForbidden] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isWide, setIsWide] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [volFlash, setVolFlash] = useState<{
    dir: "up" | "down";
    nonce: number;
  } | null>(null);
  const [seekFlash, setSeekFlash] = useState<{
    dir: "back" | "fwd";
    nonce: number;
  } | null>(null);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === wrapperRef.current);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => undefined);
    else video.pause();
  };

  const toggleFullscreen = async () => {
    const el = wrapperRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) await el.requestFullscreen();
      else await document.exitFullscreen();
    } catch (e) {
      console.error("Fullscreen failed:", e);
    }
  };

  const toggleWide = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => undefined);
    }
    setIsWide((v) => !v);
  }, []);

  const seekBy = (delta: number) => {
    const video = videoRef.current;
    if (!video) return;
    const next = Math.min(
      Math.max(video.currentTime + delta, 0),
      Number.isFinite(video.duration) ? video.duration : video.currentTime,
    );
    video.currentTime = next;
    setCurrentTime(next);
    setSeekFlash((f) => ({
      dir: delta > 0 ? "fwd" : "back",
      nonce: (f?.nonce ?? 0) + 1,
    }));
  };

  const changeVolume = (delta: number) => {
    const video = videoRef.current;
    if (!video) return;
    const next = Math.min(Math.max(video.volume + delta, 0), 1);
    video.volume = next;
    if (next > 0) video.muted = false;
    setVolFlash((f) => ({
      dir: delta > 0 ? "up" : "down",
      nonce: (f?.nonce ?? 0) + 1,
    }));
  };

  useEffect(() => {
    const isActive = () =>
      isHovered || isFocused || document.fullscreenElement === wrapperRef.current;

    const onKeyDown = (e: KeyboardEvent) => {
      if (!isActive()) return;
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
        return;
      }

      switch (e.key) {
        case " ":
          e.preventDefault();
          togglePlay();
          break;
        case "f":
        case "F":
          toggleFullscreen();
          break;
        case "w":
        case "W":
          toggleWide();
          break;
        case "ArrowUp":
          e.preventDefault();
          changeVolume(0.1);
          break;
        case "ArrowDown":
          e.preventDefault();
          changeVolume(-0.1);
          break;
        case "ArrowLeft":
          e.preventDefault();
          seekBy(-20);
          break;
        case "ArrowRight":
          e.preventDefault();
          seekBy(20);
          break;
        case "h":
        case "H":
          setShowHelp((v) => !v);
          break;
        case "Escape":
          if (showHelp) setShowHelp(false);
          else if (isWide) setIsWide(false);
          break;
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isHovered, isFocused, isWide, showHelp, toggleWide]);

  useEffect(() => {
    if (isInitializing) return;

    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;
    const antiCacheUrl = src.includes("?")
      ? `${src}&t=${Date.now()}`
      : `${src}?t=${Date.now()}`;

    if (video.canPlayType("application/vnd.apple.mpegcurl")) {
      video.src = src;
    } else if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: false,
        manifestLoadingMaxRetry: 1,
        xhrSetup: (xhr, url) => {
          console.log("HLS requesting:", url);
          if (url.includes(window.location.host) || !url.startsWith("http")) {
            const baseUrl = src.substring(0, src.lastIndexOf("/") + 1);
            const fileName = url.split("/").pop();
            const correctedUrl = new URL(fileName!, baseUrl).href;
            xhr.open("GET", correctedUrl, true);
            console.log("Corrected URL:", correctedUrl); // Проверь в консоли!
          }
          if (isAuth) {
            xhr.setRequestHeader("Authorization", `Bearer ${token}`);
          }
        },
      });
      hls.on(Hls.Events.MANIFEST_LOADED, (_event, data) => {
        setIsForbidden(false);
        setErrorMessage(null);
        console.log("Manifest loaded, levels found:", data.levels.length);
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        console.error("HLS Error Detail:", data);
        if (data.response && data.response.code === 403) {
          setIsForbidden(true);
          const responseText = JSON.parse(data.networkDetails.responseText);
          setErrorMessage(responseText.error);
        }
      });
      hls.loadSource(antiCacheUrl);
      hls.attachMedia(video);
      return () => {
        if (hls) {
          hls.destroy();
        }
        video.src = "";
      };
    }
  }, [src, isAuth, token, isInitializing]);

  if (isInitializing) {
    return (
      <div className="w-full aspect-video bg-zinc-950 animate-pulse rounded-xl" />
    );
  }

  return (
    <div
      key={`${src}-${isAuth}`}
      ref={wrapperRef}
      tabIndex={0}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      className={`group outline-none w-full overflow-hidden ${
        isWide
          ? "fixed inset-0 z-50 bg-zinc-950 flex items-center justify-center"
          : "relative aspect-video bg-zinc-950 rounded-xl"
      }`}
    >
      {isForbidden ? (
        <div className="flex flex-col items-center justify-center w-full h-full p-6 text-center animate-in fade-in duration-500">
          <div className="flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-destructive/10 text-destructive">
            <Lock className="size-5" />
          </div>
          <h3 className="text-lg font-semibold text-zinc-100 uppercase tracking-wider">
            {errorMessage}
          </h3>
        </div>
      ) : (
        <>
          {volFlash && (
            <div
              key={volFlash.nonce}
              className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none"
            >
              <div className="animate-flash">
                <VolumeIcon volume={volume} muted={isMuted} size="size-8" />
              </div>
            </div>
          )}
          {seekFlash && (
            <div
              key={seekFlash.nonce}
              className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none"
            >
              <div className="animate-flash">
                {seekFlash.dir === "fwd" ? (
                  <RotateCw className="size-8" />
                ) : (
                  <RotateCcw className="size-8" />
                )}
              </div>
            </div>
          )}
          {showHelp && (
            <div
              className="absolute inset-0 z-20 flex items-center justify-center bg-black/60"
              onClick={() => setShowHelp(false)}
            >
              <div
                className="bg-card text-card-foreground border-4 border-primary shadow-[8px_8px_0_0_rgba(0,0,0,1)] p-5 max-w-xs w-full mx-4"
                onClick={(e) => e.stopPropagation()}
              >
                <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-4">
                  Keyboard Shortcuts
                </h4>
                <ul className="flex flex-col gap-2 text-[10px] uppercase tracking-wider">
                  <li className="flex items-center justify-between gap-3">
                    <span>Play / Pause</span>
                    <kbd className="bg-muted px-1.5 py-0.5 border border-foreground/20">SPACE</kbd>
                  </li>
                  <li className="flex items-center justify-between gap-3">
                    <span>Fullscreen</span>
                    <kbd className="bg-muted px-1.5 py-0.5 border border-foreground/20">F</kbd>
                  </li>
                  <li className="flex items-center justify-between gap-3">
                    <span>Wide screen</span>
                    <kbd className="bg-muted px-1.5 py-0.5 border border-foreground/20">W</kbd>
                  </li>
                  <li className="flex items-center justify-between gap-3">
                    <span>Volume</span>
                    <kbd className="bg-muted px-1.5 py-0.5 border border-foreground/20">↑ / ↓</kbd>
                  </li>
                  <li className="flex items-center justify-between gap-3">
                    <span>Seek ±20s</span>
                    <kbd className="bg-muted px-1.5 py-0.5 border border-foreground/20">← / →</kbd>
                  </li>
                  <li className="flex items-center justify-between gap-3">
                    <span>Show / hide help</span>
                    <kbd className="bg-muted px-1.5 py-0.5 border border-foreground/20">H</kbd>
                  </li>
                  <li className="flex items-center justify-between gap-3">
                    <span>Close help / exit wide</span>
                    <kbd className="bg-muted px-1.5 py-0.5 border border-foreground/20">ESC</kbd>
                  </li>
                </ul>
              </div>
            </div>
          )}
          <video
            ref={videoRef}
            className="w-full h-full max-h-[inherit] object-contain cursor-pointer"
            autoPlay
            playsInline
            onClick={togglePlay}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
            onVolumeChange={(e) => {
              setVolume(e.currentTarget.volume);
              setIsMuted(e.currentTarget.muted);
            }}
          />

          {/* Custom Controls */}
          <div className="absolute bottom-0 inset-x-0 z-10 px-3 pb-2 pt-8 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={currentTime}
              onChange={(e) => {
                const video = videoRef.current;
                if (video) video.currentTime = Number(e.target.value);
                setCurrentTime(Number(e.target.value));
              }}
              className="w-full h-1 cursor-pointer accent-white"
            />
            <div className="flex items-center gap-2 mt-1.5">
              <button
                onClick={togglePlay}
                title={isPlaying ? "Pause" : "Play"}
                className="cursor-pointer text-white hover:text-zinc-300 transition-colors shrink-0"
              >
                {isPlaying ? (
                  <Pause className="size-5" />
                ) : (
                  <Play className="size-5" />
                )}
              </button>

              <span className="text-[10px] font-bold uppercase tracking-wider text-white/90 shrink-0 tabular-nums">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>

              <div className="flex-1" />

              <button
                onClick={() => {
                  const video = videoRef.current;
                  if (!video) return;
                  video.muted = !video.muted;
                }}
                title={isMuted ? "Unmute" : "Mute"}
                className="cursor-pointer text-white hover:text-zinc-300 transition-colors shrink-0"
              >
                <VolumeIcon volume={volume} muted={isMuted} />
              </button>

              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  const video = videoRef.current;
                  const v = Number(e.target.value);
                  if (video) {
                    video.volume = v;
                    video.muted = v === 0;
                  }
                }}
                className="w-20 h-1 cursor-pointer accent-white shrink-0"
              />

              <button
                onClick={toggleWide}
                title={isWide ? "Shrink video" : "Stretch video to screen width"}
                className="cursor-pointer text-white hover:text-zinc-300 transition-colors shrink-0"
              >
                {isWide ? (
                  <Minimize2 className="size-5" />
                ) : (
                  <Maximize2 className="size-5" />
                )}
              </button>

              <button
                onClick={() => setShowHelp((v) => !v)}
                title="Keyboard shortcuts (H)"
                className="cursor-pointer text-white hover:text-zinc-300 transition-colors shrink-0"
              >
                <Keyboard className="size-5" />
              </button>

              <button
                onClick={toggleFullscreen}
                title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                className="cursor-pointer text-white hover:text-zinc-300 transition-colors shrink-0"
              >
                {isFullscreen ? (
                  <Minimize className="size-5" />
                ) : (
                  <Fullscreen className="size-5" />
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
