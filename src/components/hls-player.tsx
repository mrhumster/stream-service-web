import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { useAuth } from "@/hooks/useAuth";
import { Lock } from "pixelarticons/react";
import { Maximize2, Minimize2, Fullscreen, Minimize } from "lucide-react";

export const HLSPlayer = ({ src }: { src: string }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { isAuth, token, isInitializing } = useAuth();
  const [isForbidden, setIsForbidden] = useState<Boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isWide, setIsWide] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === wrapperRef.current);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

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
  useEffect(() => {
    if (isInitializing) return;

    setIsForbidden(false);
    setErrorMessage(null);
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
      className={`relative w-full aspect-video bg-zinc-950 overflow-hidden rounded-xl ${
        isWide ? "fixed top-0 left-0 w-screen z-50 rounded-none" : ""
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
          <video
            ref={videoRef}
            controls
            className="w-full h-full max-h-[inherit] object-contain"
            autoPlay
            playsInline
          />
          <div className="absolute top-2 right-2 z-10 flex gap-2">
            <button
              onClick={() => setIsWide((v) => !v)}
              title={isWide ? "Shrink video" : "Stretch video to screen width"}
              className="cursor-pointer bg-black/60 text-white border-2 border-white/40 p-1.5 hover:border-white hover:bg-black/80 transition-colors"
            >
              {isWide ? (
                <Minimize2 className="size-4" />
              ) : (
                <Maximize2 className="size-4" />
              )}
            </button>
            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              className="cursor-pointer bg-black/60 text-white border-2 border-white/40 p-1.5 hover:border-white hover:bg-black/80 transition-colors"
            >
              {isFullscreen ? (
                <Minimize className="size-4" />
              ) : (
                <Fullscreen className="size-4" />
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
};
