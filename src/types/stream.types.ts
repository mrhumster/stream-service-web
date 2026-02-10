export type StreamStatus = "draft" | "processing" | "ready" | "published" | "error"
export type StreamVisibility = "public" | "private" | "unlisted"

export interface StreamResponse {
  id: string
  title: string
  description: string
  status: StreamStatus
  owner_id: string
  visibility: StreamVisibility
  tags: string[]
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  published_at: string | null
  storage: Record<string, string>
}
