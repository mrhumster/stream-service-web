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
}

export interface StreamMetadata {
  duration: number;
  size: number;
  format: string;
  resolution: string;
}

export interface StreamStorage {
  provider: string;
  bucket: string;
  key: string;
  filename: string;
}

export interface StreamProcessing {
  progress: number;
  steps: string[];
  error: string | null;
  task_id: string;
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
  processing: StreamProcessing;
}

export interface StreamListParams {
  limit?: number;
  offset?: number;
}

export interface StreamListResponse {
  items: StreamResponse[];
  total: number;
  limit: number;
  offset: number;
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
