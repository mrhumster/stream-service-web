import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { authSlice } from "../feature/auth/authSlice";
import { authApi } from "../services/auth";
import { userApi } from "../services/users";
import { streamApi } from "../services/streams";

const rootReducer = combineReducers({
  [authApi.reducerPath]: authApi.reducer,
  [userApi.reducerPath]: userApi.reducer,
  [streamApi.reducerPath]: streamApi.reducer,
  auth: authSlice.reducer,
});

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .concat(authApi.middleware)
      .concat(userApi.middleware)
      .concat(streamApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
