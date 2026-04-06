import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface VideoProgress {
  streamId: string;
  progress: number;
  status: "processing" | "ready" | "error";
  error?: string;
}

interface VideoProgressState {
  [streamId: string]: VideoProgress;
}

const initialState: VideoProgressState = {};

export const videoProgressSlice = createSlice({
  name: "videoProgress",
  initialState,
  reducers: {
    updateProgress: (state, action: PayloadAction<VideoProgress>) => {
      const { streamId, progress, status } = action.payload;
      state[streamId] = {
        ...state[streamId],
        ...action.payload,
        status: progress === 100 && status === "processing" ? "ready" : status,
      };
    },
    clearProgress: (state, action: PayloadAction<string>) => {
      delete state[action.payload];
    },
    setError: (
      state,
      action: PayloadAction<{ streamId: string; error: string }>,
    ) => {
      const { streamId, error } = action.payload;
      if (state[streamId]) {
        state[streamId].status = "error";
        state[streamId].error = error;
      }
    },
  },
});

export const { updateProgress, clearProgress, setError } =
  videoProgressSlice.actions;
export default videoProgressSlice.reducer;
