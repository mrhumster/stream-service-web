import { useEffect, useRef } from "react";
import Hls from "hls.js";

export const HLSPlayer = ({ src }: { src: string }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.canPlayType("application/vnd.apple.mpegcurl")) {
      video.src = src;
    } else if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: false,
        xhrSetup: (xhr, url) => {
          console.log("HLS requesting:", url);
          if (url.includes(window.location.host) || !url.startsWith("http")) {
            const baseUrl = src.substring(0, src.lastIndexOf("/") + 1);
            const fileName = url.split("/").pop();
            const correctedUrl = new URL(fileName!, baseUrl).href;
            xhr.open("GET", correctedUrl, true);
            console.log("Corrected URL:", correctedUrl); // Проверь в консоли!
          }
        },
      });
      hls.on(Hls.Events.MANIFEST_LOADED, (_event, data) => {
        console.log("Manifest loaded, levels found:", data.levels.length);
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        console.error("HLS Error Detail:", data);
      });
      hls.loadSource(src);
      hls.attachMedia(video);
      return () => hls.destroy();
    }
  }, [src]);

  return (
    <video
      ref={videoRef}
      controls
      className="w-full h-full max-h-[inherit] object-contain"
      autoPlay
      playsInline
    />
  );
};
