export type StreamStatus = "draft" | "processing" | "ready" | "published" | "error"
export type StreamVisibility = "public" | "private" | "unlisted"

export interface CreateStreamRequest {
  title: string
  description: string
  visibility: StreamVisibility
  tags: string[]
}

export interface UpdateStreamRequest {
  title?: string
  description?: string
  visibility?: StreamVisibility
  tags?: string[]
}

export interface StreamMetadata {
  duration: number
  size: number
  format: string
  resolution: string
}

export interface StreamStorage {
  provider: string
  bucket: string
  key: string
  filename: string
}

export interface StreamProcessing {
  progress: number
  steps: string[]
  error: string | null
}

export interface StreamAnalytics {
  views: number
  likes: number
}

export interface StreamResponse {
  id: string
  title: string
  description: string
  status: StreamStatus
  owner_id: string
  visibility: StreamVisibility
  tags: string[] | null
  metadata: StreamMetadata | null
  storage: StreamStorage | null
  created_at: string
  updated_at: string
  published_at: string | null
}

export interface StreamListParams {
  limit?: number
  offset?: number
}

export interface StreamListResponse {
  items: StreamResponse[]
  total: number
  limit: number
  offset: number
}
