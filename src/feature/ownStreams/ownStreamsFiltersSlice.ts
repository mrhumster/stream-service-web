import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type {
  FacesFilterValue,
  StreamSortBy,
  StreamSortOrder,
  StreamStatusFilter,
  StreamViewMode,
} from "@/types/stream.types";

interface OwnStreamsFiltersState {
  statusFilter: StreamStatusFilter;
  facesFilter: FacesFilterValue;
  sortField: StreamSortBy;
  sortDir: StreamSortOrder;
  viewMode: StreamViewMode;
}

const STORAGE_KEY = "gocast-own-streams-filters";

const DEFAULTS: OwnStreamsFiltersState = {
  statusFilter: "all",
  facesFilter: "all",
  sortField: "created_at",
  sortDir: "desc",
  viewMode: "table",
};

function loadFilters(): OwnStreamsFiltersState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return DEFAULTS;
}

function saveFilters(state: OwnStreamsFiltersState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

const initialState: OwnStreamsFiltersState = loadFilters();

const ownStreamsFiltersSlice = createSlice({
  name: "ownStreamsFilters",
  initialState,
  reducers: {
    setStatusFilter(state, action: PayloadAction<StreamStatusFilter>) {
      state.statusFilter = action.payload;
      saveFilters(state);
    },
    setFacesFilter(state, action: PayloadAction<FacesFilterValue>) {
      state.facesFilter = action.payload;
      saveFilters(state);
    },
    setSortField(state, action: PayloadAction<StreamSortBy>) {
      state.sortField = action.payload;
      saveFilters(state);
    },
    setSortDir(state, action: PayloadAction<StreamSortOrder>) {
      state.sortDir = action.payload;
      saveFilters(state);
    },
    setViewMode(state, action: PayloadAction<StreamViewMode>) {
      state.viewMode = action.payload;
      saveFilters(state);
    },
  },
});

export const {
  setStatusFilter,
  setFacesFilter,
  setSortField,
  setSortDir,
  setViewMode,
} = ownStreamsFiltersSlice.actions;
export const ownStreamsFiltersReducer = ownStreamsFiltersSlice.reducer;

export const selectOwnStreamsFilters = (state: {
  ownStreamsFilters: OwnStreamsFiltersState;
}) => state.ownStreamsFilters;