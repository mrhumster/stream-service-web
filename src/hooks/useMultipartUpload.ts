import { useState } from "react";
import { streamApi } from "@/services/streams";
import type { MultipartPart } from "@/types/stream.types";

const MAX_PART_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 500;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const useMultipartUpload = () => {
  const [init] = streamApi.useInitUploadMutation();
  const [uploadPart] = streamApi.usePartUploadMutation();
  const [complete] = streamApi.useCompleteUploadMutation();
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const processUpload = async (
    streamID: string,
    file: File,
    onProgress?: (progress: number) => void,
  ) => {
    setIsUploading(true);
    setError(null);
    setProgress(0);
    try {
      const { upload_id } = await init({
        id: streamID,
        body: {
          file_name: file.name,
          total_size: file.size,
          content_type: file.type,
        },
      }).unwrap();

      const CHUNK_SIZE = 5 * 1024 * 1024;
      const totalParts = Math.ceil(file.size / CHUNK_SIZE);
      let uploadedPartsCount = 0;
      const partsMetadata: MultipartPart[] = [];

      const uploadChunk = async (partNumber: number): Promise<MultipartPart> => {
        const start = (partNumber - 1) * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const blob = file.slice(start, end);

        let attempt = 1;
        for (;;) {
          try {
            const res = await uploadPart({
              id: streamID,
              body: { upload_id, part_number: partNumber, video: blob as File },
            }).unwrap();
            uploadedPartsCount++;
            const currentProgress = Math.round(
              (uploadedPartsCount / totalParts) * 100,
            );
            setProgress(currentProgress);
            onProgress?.(currentProgress);
            return { part_number: partNumber, etag: res.etag };
          } catch {
            if (attempt >= MAX_PART_ATTEMPTS) {
              throw new Error(
                `Upload failed on part ${partNumber} after ${MAX_PART_ATTEMPTS} attempts`,
              );
            }
            attempt++;
            await delay(RETRY_BASE_DELAY_MS * (attempt - 1));
          }
        }
      };

      const concurrency = 3;
      for (let i = 1; i <= totalParts; i += concurrency) {
        const p = [];
        for (let j = 0; j < concurrency && i + j <= totalParts; j++) {
          p.push(uploadChunk(i + j));
        }
        const results = await Promise.all(p);
        partsMetadata.push(...results);
      }

      await complete({
        id: streamID,
        body: {
          parts: partsMetadata.sort((a, b) => a.part_number - b.part_number),
        },
      }).unwrap();
      setProgress(100);
      onProgress?.(100);
      return { success: true };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Video upload failed";
      setError(message);
      throw err;
    } finally {
      setIsUploading(false);
    }
  };
  return { processUpload, isUploading, progress, error };
};
