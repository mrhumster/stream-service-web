import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import { type RootState } from "../store/store.ts";
import { eraseAuth, tokenReceived } from "../feature/auth/authSlice";
import { streamApi } from "./streams.ts";
import type { LoginResponse } from "../types/auth.types.ts";
import type {
  FacesListResponse,
  FaceDetailResponse,
  FaceCluster,
  FaceCropReplaceResponse,
  StreamFacesResponse,
  RenameFaceRequest,
  MergeFacesRequest,
  MergeFacesResponse,
  DeleteFaceResponse,
} from "../types/face.types.ts";

const baseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_FACES_URL as string,
  credentials: "include",
  timeout: 30000,
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.token;
    if (token) headers.set("authorization", `Bearer ${token}`);
    return headers;
  },
});

const refreshBaseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_URL as string,
  credentials: "include",
  timeout: 30000,
});

/* Crop-fetch concurrency cap. FaceCrop lazy-loads a crop per cluster row, and
 * scrolling a large /people list can put dozens in flight at once. That burst
 * saturates faces-service's DB pool and produced unhandled 500s. We bound
 * in-flight crop requests here (defense-in-depth alongside the backend's pool
 * queueing). */
const CROP_MAX_CONCURRENCY = 8;
let cropInFlight = 0;
const cropWaiters: Array<() => void> = [];

function acquireCropSlot(): Promise<void> {
  return new Promise<void>((resolve) => {
    const tryAcquire = () => {
      if (cropInFlight < CROP_MAX_CONCURRENCY) {
        cropInFlight++;
        resolve();
      } else {
        cropWaiters.push(tryAcquire);
      }
    };
    tryAcquire();
  });
}

function releaseCropSlot() {
  cropInFlight--;
  const next = cropWaiters.shift();
  if (next) next();
}

const isCropUrl = (args: string | FetchArgs): boolean =>
  typeof args === "string"
    ? args.includes("/crop")
    : String(args.url).includes("/crop");

const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const run = () => baseQueryWithRetry(args, api, extraOptions);

  if (isCropUrl(args)) {
    await acquireCropSlot();
    try {
      return await run();
    } finally {
      releaseCropSlot();
    }
  }
  return run();
};

const baseQueryWithRetry: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    const refreshResult = await refreshBaseQuery(
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

export const facesApi = createApi({
  reducerPath: "facesApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Faces"],
  endpoints: (builder) => ({
    listFaces: builder.query<FacesListResponse, void>({
      query: () => "faces",
      providesTags: () => [{ type: "Faces" as const, id: "LIST" }],
    }),
    getFace: builder.query<FaceDetailResponse, string>({
      query: (clusterId) => `faces/${clusterId}`,
      providesTags: (_res, _err, id) => [{ type: "Faces" as const, id }],
    }),
    renameFace: builder.mutation<FaceCluster, { id: string; body: RenameFaceRequest }>({
      query: ({ id, body }) => ({
        url: `faces/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_res, _err, { id }) => [
        { type: "Faces" as const, id },
        { type: "Faces" as const, id: "LIST" },
      ],
    }),
    listStreamFaces: builder.query<StreamFacesResponse, string>({
      query: (streamId) => `streams/${streamId}/faces`,
      providesTags: (_res, _err, streamId) => [
        { type: "Faces" as const, id: streamId },
        { type: "Faces" as const, id: "LIST" },
      ],
    }),
    getFaceCrop: builder.query<Blob, string>({
      query: (clusterId) => ({
        url: `faces/${clusterId}/crop`,
        responseHandler: (response) => response.blob(),
      }),
      providesTags: (_res, _err, id) => [{ type: "Faces" as const, id }],
    }),
    replaceFaceCrop: builder.mutation<
      FaceCropReplaceResponse,
      { id: string; file: File }
    >({
      query: ({ id, file }) => {
        const form = new FormData();
        form.append("file", file);
        return {
          url: `faces/${id}/crop`,
          method: "PUT",
          body: form,
        };
      },
      invalidatesTags: (_res, _err, { id }) => [
        { type: "Faces" as const, id },
        { type: "Faces" as const, id: "LIST" },
      ],
    }),
    deleteFace: builder.mutation<DeleteFaceResponse, string>({
      query: (clusterId) => ({
        url: `faces/${clusterId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_res, _err, clusterId) => [
        { type: "Faces" as const, id: clusterId },
        { type: "Faces" as const, id: "LIST" },
      ],
      async onQueryStarted(_clusterId, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(streamApi.util.invalidateTags(["Stream"]));
        } catch {
          // nothing to roll back
        }
      },
    }),
    mergeFaces: builder.mutation<MergeFacesResponse, MergeFacesRequest>({
      query: (body) => ({
        url: "faces/merge",
        method: "POST",
        body,
      }),
      invalidatesTags: (_res, _err, { cluster_ids }) => [
        { type: "Faces" as const, id: "LIST" },
        ...cluster_ids.map((id) => ({ type: "Faces" as const, id })),
      ],
      async onQueryStarted(_args, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(streamApi.util.invalidateTags(["Stream"]));
        } catch {
          // nothing to roll back
        }
      },
    }),
  }),
});

export const {
  useListFacesQuery,
  useGetFaceQuery,
  useRenameFaceMutation,
  useListStreamFacesQuery,
  useGetFaceCropQuery,
  useReplaceFaceCropMutation,
  useDeleteFaceMutation,
  useMergeFacesMutation,
} = facesApi;