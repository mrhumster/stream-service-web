import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { LoginRequest, LoginResponse } from "../types/auth.types";

export const authApi = createApi({
  reducerPath: "authApi",
  baseQuery: fetchBaseQuery({ baseUrl: "https://api.example.com/auth" }),
  endpoints: (builder) => ({
    getToken: builder.mutation<LoginResponse, LoginRequest>({
      query: (args) => {
        return {
          url: "/login",
          method: "POST",
          body: args,
        };
      },
    }),
  }),
});

export const { useGetTokenMutation } = authApi;
