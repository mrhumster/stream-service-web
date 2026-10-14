import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type {
  FacesLayout,
  FaceSortField,
  FacesViewMode,
} from "@/types/face.types";

interface PeopleViewState {
  mode: FacesViewMode;
  layout: FacesLayout;
  sortField: FaceSortField;
}

const STORAGE_KEY = "gocast-people-view";

const DEFAULTS: PeopleViewState = {
  mode: "people",
  layout: "list",
  sortField: "name",
};

function loadView(): PeopleViewState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return DEFAULTS;
}

function saveView(state: PeopleViewState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

const initialState: PeopleViewState = loadView();

const peopleViewSlice = createSlice({
  name: "peopleView",
  initialState,
  reducers: {
    setMode(state, action: PayloadAction<FacesViewMode>) {
      state.mode = action.payload;
      saveView(state);
    },
    setLayout(state, action: PayloadAction<FacesLayout>) {
      state.layout = action.payload;
      saveView(state);
    },
    setSortField(state, action: PayloadAction<FaceSortField>) {
      state.sortField = action.payload;
      saveView(state);
    },
  },
});

export const { setMode, setLayout, setSortField } = peopleViewSlice.actions;
export const peopleViewReducer = peopleViewSlice.reducer;

export const selectPeopleView = (state: { peopleView: PeopleViewState }) =>
  state.peopleView;
