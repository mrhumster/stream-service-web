import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import { type RootState } from "../store/store.ts";
import { eraseAuth, tokenReceived } from "../feature/auth/authSlice";
import type { LoginResponse } from "../types/auth.types.ts";
import type { ReactionKind, StreamStats } from "../types/stats.types.ts";

const baseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_STATS_URL as string,
  credentials: "include",
  timeout: 30000,
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.token;
    if (token) headers.set("authorization", `Bearer ${token}`);
    return headers;
  },
});

const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    const refreshResult = await baseQuery(
      { url: "auth/refresh", method: "POST" },
      api,
      extraOptions,
    );
    if (refreshResult.data) {
      api.dispatch(tokenReceived(refreshResult.data as LoginResponse));
      result = await baseQuery(args, api, extraOptions);
    } else api.dispatch(eraseAuth());
  }

  return result;
};

export const statsApi = createApi({
  reducerPath: "statsApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["StreamStats"],
  endpoints: (builder) => ({
    getStats: builder.query<StreamStats, string>({
      query: (streamId) => `streams/${streamId}/stats`,
      providesTags: (_, __, streamId) => [{ type: "StreamStats", id: streamId }],
    }),
    setReaction: builder.mutation<
      StreamStats,
      { streamId: string; kind: ReactionKind }
    >({
      query: ({ streamId, kind }) => ({
        url: `streams/${streamId}/reaction`,
        method: "PUT",
        body: JSON.stringify({ kind }),
        headers: { "Content-Type": "application/json" },
      }),
      invalidatesTags: (_, __, { streamId }) => [
        { type: "StreamStats", id: streamId },
      ],
    }),
    registerView: builder.mutation<{ ok: boolean }, string>({
      query: (streamId) => ({
        url: `streams/${streamId}/views`,
        method: "POST",
      }),
      invalidatesTags: (_, __, streamId) => [
        { type: "StreamStats", id: streamId },
      ],
    }),
  }),
});

export const {
  useGetStatsQuery,
  useSetReactionMutation,
  useRegisterViewMutation,
} = statsApi;