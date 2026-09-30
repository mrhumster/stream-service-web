export interface FaceClusterVideo {
  stream_id: string;
  count: number;
}

export interface FaceCluster {
  id: string;
  owner_id?: string;
  name: string | null;
  is_named: boolean;
  sample_count: number;
  centroid?: number[];
  crop_object?: string | null;
  created_at: string;
  updated_at: string;
  video_count?: number;
  videos?: FaceClusterVideo[];
}

export interface FaceOccurrence {
  stream_id: string;
  t_seconds: number;
  confidence: number;
  created_at: string;
}

export type FaceClusterWithStats = FaceCluster & {
  video_count: number;
  videos: FaceClusterVideo[];
};

export interface SimilarMember<T extends FaceCluster = FaceCluster> {
  cluster: T;
  sim: number;
}

export interface SimilarityGroup<T extends FaceCluster = FaceCluster> {
  rep: T;
  members: SimilarMember<T>[];
  maxSim: number;
}

export interface FaceListParams {
  limit?: number;
  offset?: number;
}

export interface FaceNameSuggestion {
  id: string;
  name: string | null;
  is_named: boolean;
  sample_count: number;
  crop_object?: string | null;
}

export interface FacesSuggestResponse {
  clusters: FaceNameSuggestion[];
}

export interface FacesListResponse {
  clusters: FaceClusterWithStats[];
  groups: SimilarityGroup<FaceClusterWithStats>[];
  total: number;
  empty_count: number;
  rest_total: number;
  limit: number;
  offset: number;
}

export interface DeleteEmptyFacesResponse {
  deleted: number;
}

export interface BatchDeleteFacesRequest {
  cluster_ids: string[];
}

export interface BatchDeleteFacesResponse {
  deleted: number;
}

export interface DetachStreamFaceResponse {
  cluster_id: string;
  stream_id: string;
  removed: number;
  sample_count: number;
  cluster_deleted: boolean;
}

export interface FaceDetailResponse {
  cluster: FaceCluster;
  occurrences: FaceOccurrence[];
  videos: FaceClusterVideo[];
}

export interface StreamFacesCluster {
  cluster: FaceCluster;
  count: number;
  occurrences: FaceOccurrence[];
}

export interface StreamFacesResponse {
  clusters: StreamFacesCluster[];
}

export interface RenameFaceRequest {
  name: string | null;
}

export interface MergeFacesRequest {
  cluster_ids: string[];
}

export interface MergeFacesResponse {
  cluster: FaceCluster;
  merged_ids: string[];
  target_id: string;
}

export interface DeleteFaceResponse {
  cluster_id: string;
}

export interface FaceCropReplaceResponse {
  cluster: FaceCluster;
  crop_object: string;
}

/* Interactive frame assist: the owner pauses the player, the paused frame is
 * sent for detection and every face is offered to a cluster. */

export interface FrameFaceSuggestion {
  id: string;
  name: string | null;
  is_named: boolean;
  sample_count: number;
  crop_object: string | null;
  similarity: number;
  /** at/above the server's auto threshold — attach without asking */
  auto: boolean;
}

export interface DetectedFrameFace {
  /** [x1, y1, x2, y2] in the pixels of the uploaded frame */
  bbox: [number, number, number, number];
  confidence: number;
  /** null = nothing close enough, the UI offers to create a new person */
  suggestion: FrameFaceSuggestion | null;
}

export interface DetectFrameResponse {
  faces: DetectedFrameFace[];
  /** dimensions of the frame that was analysed (the client may have downscaled) */
  width: number;
  height: number;
  /** server-side handling time, so the client can tell network from inference */
  took_ms: number;
}

export interface AttachFrameFaceResponse {
  cluster: FaceCluster;
  created: boolean;
  written: number;
  t_seconds: number;
}