import { useAuth } from "./useAuth";

export function useVideoUrl(streamId: string) {
  const { token } = useAuth();
  const url = `${import.meta.env.VITE_HLS_URL}/stream/${streamId}/hls/index.m3u8`;

  return {
    url,
    token,
    isLoading: null,
    error: null,
  };
}
