import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { authSlice } from "../feature/auth/authSlice";
import { videoProgressSlice } from "../feature/videoProgress/videoProgressSlice";
import { authApi } from "../services/auth";
import { userApi } from "../services/users";
import { streamApi } from "../services/streams";
import { socketMiddleware } from "../store/middleware/socketMiddleware";
import { authListener } from "./middleware/authListener";

const rootReducer = combineReducers({
  [authApi.reducerPath]: authApi.reducer,
  [userApi.reducerPath]: userApi.reducer,
  [streamApi.reducerPath]: streamApi.reducer,
  auth: authSlice.reducer,
  videoProgress: videoProgressSlice.reducer,
});

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .concat(authApi.middleware)
      .concat(userApi.middleware)
      .concat(streamApi.middleware)
      .concat(socketMiddleware)
      .concat(authListener.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
