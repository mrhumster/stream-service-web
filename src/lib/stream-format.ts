import type { StreamStatus } from "@/types/stream.types";

export const statusConfig: Record<
  StreamStatus,
  { label: string; className: string }
> = {
  draft: { label: "DRAFT", className: "bg-muted text-muted-foreground" },
  processing: { label: "PROCESSING", className: "bg-yellow-500 text-black" },
  ready: { label: "READY", className: "bg-blue-500 text-white" },
  published: { label: "PUBLISHED", className: "bg-green-600 text-white" },
  error: { label: "ERROR", className: "bg-red-600 text-white" },
};

export const defaultStatus = {
  label: "UNKNOWN",
  className: "bg-muted text-muted-foreground",
};

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const THUMBNAIL_BASE_URL =
  "https://storage.example.com/go-app-bucket/thumbnails";

export function thumbnailUrl(streamId: string): string {
  return `${THUMBNAIL_BASE_URL}/${streamId}.jpg`;
}

export function hasThumbnail(status: StreamStatus): boolean {
  return status !== "draft" && status !== "error";
}
