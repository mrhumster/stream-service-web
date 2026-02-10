export type StreamStatus = "draft" | "processing" | "ready" | "published" | "error"
export type StreamVisibility = "public" | "private" | "unlisted"

export interface CreateStreamRequest {
  title: string
  description: string
  visibility: StreamVisibility
  tags: string[]
}

export interface StreamResponse {
  id: string
  title: string
  description: string
  status: StreamStatus
  owner_id: string
  visibility: StreamVisibility
  tags: string[] | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  published_at: string | null
  storage: Record<string, string>
}
