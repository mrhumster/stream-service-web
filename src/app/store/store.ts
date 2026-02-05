import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { authSlice } from "../feature/auth/authSlice";
import { authApi } from "../services/auth";

const rootReducer = combineReducers({
  [authApi.reducerPath]: authApi.reducer,
  auth: authSlice.reducer
});

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(authApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
