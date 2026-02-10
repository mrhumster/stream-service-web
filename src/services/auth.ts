import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { LoginRequest, LoginResponse, Success } from "../types/auth.types";
import type { RootState } from "../store/store";

const baseQuery = fetchBaseQuery({
  baseUrl: "https://api.example.com/",
  credentials: "include",
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.token;
    if (token) headers.set("authorization", `Bearer ${token}`);
    return headers;
  },
});

export const authApi = createApi({
  reducerPath: "authApi",
  baseQuery: baseQuery,
  endpoints: (builder) => ({
    getToken: builder.mutation<LoginResponse, LoginRequest>({
      query: (args) => {
        return {
          url: "auth/login",
          method: "POST",
          body: args,
        };
      },
    }),
    logout: builder.mutation<Success, void>({
      query: () => {
        return {
          url: "auth/logout",
          method: "POST",
        };
      },
    }),
  }),
});

export const { useGetTokenMutation, useLogoutMutation } = authApi;
