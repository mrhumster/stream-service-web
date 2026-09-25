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