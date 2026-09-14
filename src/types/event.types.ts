export interface ActivityEvent {
  id: string;
  event_id: string;
  user_id: string;
  event_type: string;
  stream_id?: string;
  payload?: Record<string, unknown>;
  read_at?: string | null;
  created_at: string;
}

export interface EventsFeedResponse {
  events: ActivityEvent[];
  next_cursor?: string;
}

export interface UnreadCountResponse {
  count: number;
}