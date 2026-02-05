import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const authApi = createApi({
  reducerPath: "authApi",
  baseQuery: fetchBaseQuery({ baseUrl: "https://api.example.com/auth" }),
  endpoints: (builder) => ({
    getToken: builder.mutation<any, { email: string; password: string }>({
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
