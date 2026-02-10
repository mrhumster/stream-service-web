import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { LoginResponse } from "../../types/auth.types";
import { authApi } from "../../services/auth";

export interface AuthState {
  token: string | null;
}

const initialState: AuthState = {
  token: null,
};

export const authSlice = createSlice({
  name: "auth",
  initialState: initialState,
  reducers: {
    logout: (state) => {
      state.token = null;
    },
    tokenReceived: (state, action: PayloadAction<LoginResponse>) => {
      state.token = action.payload.access_token;
    },
  },
  extraReducers: (builder) => {
    builder.addMatcher(
      authApi.endpoints.getToken.matchFulfilled,
      (state, action: PayloadAction<LoginResponse>) => {
        state.token = action.payload.access_token;
      },
    );
  },
});

export const { logout, tokenReceived } = authSlice.actions;
export default authSlice.reducer;
