import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Theme } from "@/components/theme-context";

interface SettingsState {
  autoplay: boolean;
  theme: Theme;
}

const STORAGE_KEY = "gocast-settings";

function loadSettings(): SettingsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { autoplay: true, theme: "dark" };
}

function saveSettings(state: SettingsState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

const initialState: SettingsState = loadSettings();

const settingsSlice = createSlice({
  name: "settings",
  initialState,
  reducers: {
    setAutoplay(state, action: PayloadAction<boolean>) {
      state.autoplay = action.payload;
      saveSettings(state);
    },
    setTheme(state, action: PayloadAction<Theme>) {
      state.theme = action.payload;
      saveSettings(state);
    },
  },
});

export const { setAutoplay, setTheme } = settingsSlice.actions;
export const settingsReducer = settingsSlice.reducer;
