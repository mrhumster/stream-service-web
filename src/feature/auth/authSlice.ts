import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { LoginResponse } from "../../types/auth.types";
import type { UserResponse } from "@/types/user.types";
import { authApi } from "../../services/auth";
import { userApi } from "@/services/users";

export interface AuthState {
  token: string | null;
  authUser: UserResponse | null;
}

const initialState: AuthState = {
  token: null,
  authUser: null,
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
      },
    );
    builder.addMatcher(
      userApi.endpoints.getAuthUser.matchFulfilled,
      (state, action: PayloadAction<UserResponse>) => {
        state.authUser = action.payload;
      },
    );
    builder.addMatcher(authApi.endpoints.logout.matchFulfilled, (state) => {
      state.token = null;
      state.authUser = null;
    });
  },
});

export const { tokenReceived, eraseAuth } = authSlice.actions;
export default authSlice.reducer;
