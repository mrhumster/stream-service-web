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

export interface FacesListResponse {
  clusters: (FaceCluster & { video_count: number; videos: FaceClusterVideo[] })[];
  total: number;
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

export interface FaceCropReplaceResponse {
  cluster: FaceCluster;
  crop_object: string;
}