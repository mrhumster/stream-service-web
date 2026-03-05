import { useState } from "react";
import { streamApi } from "@/services/streams";
import type { MultipartPart } from "@/types/stream.types";

export const useMultipartUpload = () => {
  const [init] = streamApi.useInitUploadMutation();
  const [uploadPart] = streamApi.usePartUploadMutation();
  const [complete] = streamApi.useCompleteUploadMutation();
  const [isUploading, setIsUploading] = useState(false);

  const processUpload = async (streamID: string, file: File) => {
    setIsUploading(true);
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
      const partsMetadata: MultipartPart[] = [];

      const uploadChunk = async (partNumber: number) => {
        const start = (partNumber - 1) * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const blob = file.slice(start, end);
        const res = await uploadPart({
          id: streamID,
          body: { upload_id, part_number: partNumber, video: blob as File },
        }).unwrap();

        return { part_number: partNumber, etag: res.etag };
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
      return { success: true };
    } finally {
      setIsUploading(false);
    }
  };
  return { processUpload, isUploading };
};
