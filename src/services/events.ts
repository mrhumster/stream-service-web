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
import type {
  EventsFeedResponse,
  UnreadCountResponse,
} from "../types/event.types.ts";

const baseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_EVENTS_URL as string,
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

export const eventApi = createApi({
  reducerPath: "eventApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Events"],
  endpoints: (builder) => ({
    getEvents: builder.query<
      EventsFeedResponse,
      { limit?: number; cursor?: string }
    >({
      query: ({ limit, cursor }) => {
        const params = new URLSearchParams();
        if (limit) params.set("limit", String(limit));
        if (cursor) params.set("cursor", cursor);
        return `events?${params.toString()}`;
      },
      providesTags: ["Events"],
    }),
    getUnreadCount: builder.query<UnreadCountResponse, void>({
      query: () => "events/unread-count",
      providesTags: ["Events"],
    }),
    markEventRead: builder.mutation<{ ok: boolean }, string>({
      query: (id) => ({ url: `events/${id}/read`, method: "POST" }),
      invalidatesTags: ["Events"],
    }),
    markAllEventsRead: builder.mutation<{ ok: boolean }, void>({
      query: () => ({ url: "events/read-all", method: "POST" }),
      invalidatesTags: ["Events"],
    }),
  }),
});

export const {
  useGetEventsQuery,
  useGetUnreadCountQuery,
  useMarkEventReadMutation,
  useMarkAllEventsReadMutation,
} = eventApi;