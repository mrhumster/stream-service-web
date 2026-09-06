import { updateProgress } from "@/feature/videoProgress/videoProgressSlice";
import { useEffect } from "react";
import { useDispatch } from "react-redux";

export const useVideoProgress = (streamId: string, token: string) => {
  const dispatch = useDispatch();

  useEffect(() => {
    const ws = new WebSocket(
      `${import.meta.env.VITE_WS_URL}?token=${token}`,
    );

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "VIDEO_PROGRESS") {
        dispatch(
          updateProgress({
            streamId: data.payload.stream_id,
            progress: data.payload.progress,
            status: data.payload.status,
          }),
        );
      }
    };
    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    return () => ws.close();
  }, [streamId, token, dispatch]);
};
