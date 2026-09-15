export interface Comment {
  id: string;
  stream_id: string;
  user_id: string;
  user_email?: string;
  parent_id?: string | null;
  body: string;
  edited_at?: string | null;
  created_at: string;
  updated_at?: string;
  reply_count?: number;
}

export interface CommentListResponse {
  comments: Comment[];
  next_cursor?: string;
}

export interface CommentInput {
  body: string;
  parent_id?: string;
}