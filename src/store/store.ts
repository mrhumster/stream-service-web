import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { authSlice } from "../feature/auth/authSlice";
import { settingsReducer } from "../feature/settings/settingsSlice";
import { authApi } from "../services/auth";
import { userApi } from "../services/users";
import { streamApi } from "../services/streams";
import { eventApi } from "../services/events";
import { commentApi } from "../services/comments";
import { socketMiddleware } from "../store/middleware/socketMiddleware";
import { authListener } from "./middleware/authListener";

const rootReducer = combineReducers({
  [authApi.reducerPath]: authApi.reducer,
  [userApi.reducerPath]: userApi.reducer,
  [streamApi.reducerPath]: streamApi.reducer,
  [eventApi.reducerPath]: eventApi.reducer,
  [commentApi.reducerPath]: commentApi.reducer,
  auth: authSlice.reducer,
  settings: settingsReducer,
});

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .concat(authApi.middleware)
      .concat(userApi.middleware)
      .concat(streamApi.middleware)
      .concat(eventApi.middleware)
      .concat(commentApi.middleware)
      .concat(socketMiddleware)
      .concat(authListener.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
