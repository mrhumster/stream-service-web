export type StreamStatus =
  | "draft"
  | "processing"
  | "ready"
  | "published"
  | "error";
export type StreamVisibility = "public" | "private" | "unlisted";

export interface CreateStreamRequest {
  title: string;
  description: string;
  visibility: StreamVisibility;
  tags: string[];
}

export interface UpdateStreamRequest {
  title?: string;
  description?: string;
  visibility?: StreamVisibility;
  tags?: string[];
  rotation?: Rotation;
}

export type Rotation = 0 | 90 | 180 | 270;

export interface StreamMetadata {
  duration: number;
  size: number;
  format: string;
  resolution: string;
  recorded_at?: string;
  location?: string;
  camera?: string;
  rotation?: number;
}

export interface StreamStorage {
  provider: string;
  bucket: string;
  key: string;
  filename: string;
}

export interface StreamProcessingTask {
  task_type: "transcode" | "thumbnail" | "faces";
  progress: number;
  steps: string[];
  error: string | null;
  task_id: string | null;
}

export interface StreamAnalytics {
  views: number;
  likes: number;
}

export interface StreamResponse {
  id: string;
  title: string;
  description: string;
  status: StreamStatus;
  owner_id: string;
  visibility: StreamVisibility;
  tags: string[] | null;
  metadata: StreamMetadata | null;
  storage: StreamStorage | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  processing: StreamProcessingTask[];
  faces_detected?: boolean;
}

export type StreamSortBy = "created_at" | "title" | "status";
export type StreamSortOrder = "asc" | "desc";

export type StreamStatusFilter = StreamStatus | "all";
export type FacesFilterValue = "all" | "detected" | "not_detected";
export type StreamViewMode = "grid" | "table";

export interface StreamListParams {
  limit?: number;
  offset?: number;
  status?: StreamStatus;
  faces_detected?: boolean;
  sort?: StreamSortBy;
  order?: StreamSortOrder;
}

export interface StreamListResponse {
  items: StreamResponse[];
  total: number;
  limit: number;
  offset: number;
}

export interface FacesBatchRequest {
  ids: string[];
}

export interface FacesBatchFailure {
  stream_id: string;
  reason: string;
}

export interface FacesBatchResponse {
  processed: string[];
  failed: FacesBatchFailure[];
}

export interface StartUploadRequest {
  file_name: string;
  total_size: number;
  content_type: string;
}

export interface StartUploadResponse {
  upload_id: string;
  stream_id: string;
}

export interface UploadPartRequest {
  upload_id: string;
  part_number: number;
  video: File;
}

export interface UploadPartResponse {
  part_number: number;
  etag: string;
}

export interface CompleteUploadRequest {
  parts: MultipartPart[];
}

export interface MultipartPart {
  part_number: number;
  etag: string;
}
