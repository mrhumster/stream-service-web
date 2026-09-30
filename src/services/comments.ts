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
  Comment,
  CommentInput,
  CommentListResponse,
} from "../types/comment.types.ts";

const baseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_COMMENTS_URL as string,
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

export const commentApi = createApi({
  reducerPath: "commentApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Comments", "Replies"],
  endpoints: (builder) => ({
    listComments: builder.query<
      CommentListResponse,
      { streamId: string; limit?: number; cursor?: string }
    >({
      query: ({ streamId, limit, cursor }) => {
        const params = new URLSearchParams();
        if (limit) params.set("limit", String(limit));
        if (cursor) params.set("cursor", cursor);
        const qs = params.toString();
        return `streams/${streamId}/comments${qs ? `?${qs}` : ""}`;
      },
      providesTags: ["Comments"],
    }),
    listReplies: builder.query<
      CommentListResponse,
      { parentId: string; limit?: number; cursor?: string }
    >({
      query: ({ parentId, limit, cursor }) => {
        const params = new URLSearchParams();
        if (limit) params.set("limit", String(limit));
        if (cursor) params.set("cursor", cursor);
        const qs = params.toString();
        return `comments/${parentId}/replies${qs ? `?${qs}` : ""}`;
      },
      providesTags: ["Replies"],
    }),
    createComment: builder.mutation<
      { comment: Comment },
      { streamId: string; input: CommentInput }
    >({
      query: ({ streamId, input }) => ({
        url: `streams/${streamId}/comments`,
        method: "POST",
        body: JSON.stringify(input),
        headers: { "Content-Type": "application/json" },
      }),
      invalidatesTags: ["Comments", "Replies"],
    }),
    updateComment: builder.mutation<
      { comment: Comment },
      { id: string; body: string }
    >({
      query: ({ id, body }) => ({
        url: `comments/${id}`,
        method: "PATCH",
        body: JSON.stringify({ body }),
        headers: { "Content-Type": "application/json" },
      }),
      invalidatesTags: ["Comments", "Replies"],
    }),
    deleteComment: builder.mutation<{ ok: boolean }, string>({
      query: (id) => ({ url: `comments/${id}`, method: "DELETE" }),
      invalidatesTags: ["Comments", "Replies"],
    }),
  }),
});

export const {
  useListCommentsQuery,
  useLazyListCommentsQuery,
  useListRepliesQuery,
  useLazyListRepliesQuery,
  useCreateCommentMutation,
  useUpdateCommentMutation,
  useDeleteCommentMutation,
} = commentApi;