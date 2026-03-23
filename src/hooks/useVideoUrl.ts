import { useAuth } from "./useAuth";

export function useVideoUrl(streamId: string) {
  const { token } = useAuth();
  const url = `https://api.example.com/stream/${streamId}/hls/index.m3u8`;

  return {
    url,
    token,
    isLoading: !token,
    error: null,
  };
}
