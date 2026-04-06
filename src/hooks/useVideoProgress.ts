import { updateProgress } from "@/feature/videoProgress/videoProgressSlice";
import { useEffect } from "react";
import { useDispatch } from "react-redux";

export const useVideoProgress = (streamId: string, token: string) => {
  const dispatch = useDispatch();

  useEffect(() => {
    const ws = new WebSocket(
      `wss://api.example.com/stream/ws/updates?token=${token}`,
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
