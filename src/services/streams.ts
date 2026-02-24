import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import { type RootState } from "../store/store";
import { eraseAuth, tokenReceived } from "../feature/auth/authSlice";
import type { LoginResponse } from "../types/auth.types";
import type {
  CreateStreamRequest,
  UpdateStreamRequest,
  StreamListParams,
  StreamListResponse,
  StreamResponse,
} from "../types/stream.types";

const baseQuery = fetchBaseQuery({
  baseUrl: "https://api.example.com/",
  credentials: "include",
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

export const streamApi = createApi({
  reducerPath: "streamApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Stream"],
  endpoints: (builder) => ({
    listStreamsPublic: builder.query<StreamListResponse, StreamListParams>({
      query: (params) => {
        const searchParams = new URLSearchParams();
        searchParams.set("limit", String(params.limit ?? 10));
        searchParams.set("offset", String(params.offset ?? 0));
        return `stream?${searchParams.toString()}`;
      },
      serializeQueryArgs: ({ endpointName }) => endpointName,
      merge: (currentCache, newItems) => {
        if (newItems.offset === 0) return newItems;
        return {
          ...newItems,
          items: [...currentCache.items, ...newItems.items],
        };
      },
      forceRefetch: ({ currentArg, previousArg }) =>
        currentArg?.offset !== previousArg?.offset,
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }: { id: string }) => ({
                type: "Stream" as const,
                id,
              })),

              { type: "Stream" as const, id: "LIST" },
            ]
          : [{ type: "Stream" as const, id: "LIST" }],
    }),
    getStream: builder.query<StreamResponse, string>({
      query: (id) => `stream/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Stream" as const, id }],
    }),
    createStream: builder.mutation<StreamResponse, CreateStreamRequest>({
      query: (body) => ({
        url: "stream/",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Stream", id: "LIST" }],
    }),
    uploadVideo: builder.mutation<void, { id: string; file: File }>({
      query: ({ id, file }) => {
        const formData = new FormData();
        formData.append("video", file);
        return {
          url: `stream/${id}/upload`,
          method: "POST",
          body: formData,
        };
      },
      invalidatesTags: (_res, _err, { id }) => [{ type: "Stream", id }],
    }),
    updateStream: builder.mutation<
      StreamResponse,
      { id: string; body: UpdateStreamRequest }
    >({
      query: ({ id, body }) => ({
        url: `stream/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_res, _err, { id }) => [
        { type: "Stream" as const, id },
        { type: "Stream" as const, id: "LIST" },
      ],
    }),
    deleteStream: builder.mutation<void, string>({
      query: (id) => ({
        url: `stream/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_res, _err, id) => [
        { type: "Stream" as const, id },
        { type: "Stream" as const, id: "LIST" },
      ],
    }),
  }),
});

export const {
  useListStreamsPublicQuery,
  useGetStreamQuery,
  useCreateStreamMutation,
  useUpdateStreamMutation,
  useUploadVideoMutation,
  useDeleteStreamMutation,
} = streamApi;
