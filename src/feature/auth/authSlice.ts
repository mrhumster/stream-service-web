import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { LoginResponse } from "../../types/auth.types";
import type { UserResponse } from "@/types/user.types";
import { authApi } from "../../services/auth";
import { userApi } from "@/services/users";

export interface AuthState {
  token: string | null;
  authUser: UserResponse | null;
  isInitializing: boolean;
}

const initialState: AuthState = {
  token: null,
  authUser: null,
  isInitializing: true,
};

export const authSlice = createSlice({
  name: "auth",
  initialState: initialState,
  reducers: {
    tokenReceived: (state, action: PayloadAction<LoginResponse>) => {
      state.token = action.payload.access_token;
    },
    eraseAuth: (state) => {
      state.token = null;
      state.authUser = null;
    },
  },
  extraReducers: (builder) => {
    builder.addMatcher(
      authApi.endpoints.getToken.matchFulfilled,
      (state, action: PayloadAction<LoginResponse>) => {
        state.token = action.payload.access_token;
        state.isInitializing = false;
      },
    );
    builder.addMatcher(authApi.endpoints.getToken.matchRejected, (state) => {
      state.isInitializing = false;
    });
    builder.addMatcher(
      userApi.endpoints.getAuthUser.matchFulfilled,
      (state, action: PayloadAction<UserResponse>) => {
        state.authUser = action.payload;
        state.isInitializing = false;
      },
    );
    builder.addMatcher(authApi.endpoints.logout.matchFulfilled, (state) => {
      state.token = null;
      state.authUser = null;
      state.isInitializing = false;
    });
    builder.addMatcher(
      userApi.endpoints.getAuthUser.matchFulfilled,
      (state) => {
        state.isInitializing = false;
      },
    );
    builder.addMatcher(userApi.endpoints.getAuthUser.matchRejected, (state) => {
      state.isInitializing = false;
    });
    builder.addMatcher(authApi.endpoints.getToken.matchPending, (state) => {
      state.isInitializing = true;
    });
    builder.addMatcher(userApi.endpoints.getAuthUser.matchPending, (state) => {
      state.isInitializing = true;
    });
  },
});

export const { tokenReceived, eraseAuth } = authSlice.actions;
export default authSlice.reducer;
