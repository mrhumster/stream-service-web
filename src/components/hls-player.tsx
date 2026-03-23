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
        xhrSetup: (xhr, url) => {
          if (url.includes(window.location.host) || !url.startsWith("http")) {
            const baseUrl = src.substring(0, src.lastIndexOf("/") + 1);
            const fileName = url.split("/").pop();
            const correctedUrl = new URL(fileName!, baseUrl).href;
            xhr.open("GET", correctedUrl, true);
            console.log("Corrected URL:", correctedUrl); // Проверь в консоли!
          }
        },
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
      className="w-full h-full"
      autoPlay
      playsInline
    />
  );
};
