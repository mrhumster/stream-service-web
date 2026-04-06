import { useAuth } from "@/hooks/useAuth";
import { useVideoProgress } from "@/hooks/useVideoProgress";
import { useSelector } from "react-redux";
import { type RootState } from "../store/store";

export function TranscoderProgress({ streamId }: { streamId: string }) {
  const auth = useAuth();
  const token = auth.token || "";
  useVideoProgress(streamId, token);

  const progress = useSelector(
    (state: RootState) => state.videoProgress[streamId],
  );

  return <div>{progress && progress.progress}</div>;
}
