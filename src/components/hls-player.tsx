import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { useAuth } from "@/hooks/useAuth";
import { Lock } from "pixelarticons/react";

export const HLSPlayer = ({ src }: { src: string }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { isAuth, token, isInitializing } = useAuth();
  const [isForbidden, setIsForbidden] = useState<Boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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
      className="relative w-full aspect-video bg-zinc-950 overflow-hidden rounded-xl"
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
        <video
          ref={videoRef}
          controls
          className="w-full h-full max-h-[inherit] object-contain"
          autoPlay
          playsInline
        />
      )}
    </div>
  );
};
