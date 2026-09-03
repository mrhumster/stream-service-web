import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { VideoDropzone } from "@/components/video-dropzone";
import {
  useCreateStreamMutation,
  useUploadVideoMutation,
} from "@/services/streams";
import { cn, getErrorMessage } from "@/lib/utils";
import { X, Check, AlertTriangle, Film, ExternalLink } from "lucide-react";
import type { StreamVisibility } from "@/types/stream.types";
import { useMultipartUpload } from "@/hooks/useMultipartUpload";
import ProgressBar from "@/components/ui/8bit/progress-bar";

const inputClassName =
  "border-4 border-black rounded-none focus-visible:ring-0 focus-visible:border-primary";

const BATCH_CONCURRENCY = 2;

type UploadMode = "single" | "batch";

type BatchItemStatus =
  | "pending"
  | "creating"
  | "uploading"
  | "done"
  | "error";

interface BatchItem {
  id: string;
  file: File;
  title: string;
  status: BatchItemStatus;
  progress: number;
  streamId?: string;
  error?: string;
}

function makeBatchItem(file: File): BatchItem {
  return {
    id: crypto.randomUUID(),
    file,
    title: file.name.replace(/\.[^.]+$/, ""),
    status: "pending",
    progress: 0,
  };
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const CreateStreamPage = () => {
  const navigate = useNavigate();
  const [createStream] = useCreateStreamMutation();
  const [uploadVideo] = useUploadVideoMutation();
  const { processUpload } = useMultipartUpload();

  const [mode, setMode] = useState<UploadMode>("single");

  // ── Single mode state ──
  const [createdStreamId, setCreatedStreamId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [visibility, setVisibility] = useState<StreamVisibility>("public");
  const [isSingleUploading, setIsSingleUploading] = useState(false);
  const {
    processUpload: singleProcessUpload,
    isUploading: isMultipartUploading,
    progress,
  } = useMultipartUpload();
  const [uploadVideoSingle] = useUploadVideoMutation();
  const [createStreamSingle] = useCreateStreamMutation();

  const isSingleLoading =
    isSingleUploading || isMultipartUploading;

  // ── Batch mode state ──
  const [batchQueue, setBatchQueue] = useState<BatchItem[]>([]);
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const batchAbortRef = useRef(false);
  const [batchComplete, setBatchComplete] = useState(false);
  const [countdown, setCountdown] = useState(10);

  const batchDoneCount = batchQueue.filter(
    (i) => i.status === "done",
  ).length;
  const batchErrorCount = batchQueue.filter(
    (i) => i.status === "error",
  ).length;
  const batchActiveCount = batchQueue.filter(
    (i) => i.status === "creating" || i.status === "uploading",
  ).length;

  // ── Batch: countdown + redirect ──
  useEffect(() => {
    if (!batchComplete) return;
    if (countdown <= 0) {
      navigate("/streams/own");
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [batchComplete, countdown, navigate]);

  // ── Tag handling (single) ──
  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const value = tagInput.trim().toLowerCase();
      if (value && !tags.includes(value)) {
        setTags([...tags, value]);
      }
      setTagInput("");
    }
  };
  const removeTag = (tag: string) => setTags(tags.filter((t) => t !== tag));

  // ── Single submit ──
  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);
    setIsSingleUploading(true);
    try {
      let streamId = createdStreamId;
      if (!streamId) {
        const stream = await createStreamSingle({
          title,
          description,
          tags,
          visibility,
        }).unwrap();
        streamId = stream.id;
        setCreatedStreamId(streamId);
      }
      if (file) {
        const minChunkSize = 5 * 1024 * 1024;
        if (file.size < minChunkSize) {
          await uploadVideoSingle({ id: streamId, file }).unwrap();
        } else {
          await singleProcessUpload(streamId, file);
        }
      }
      navigate(`/streams/${streamId}`);
    } catch (err) {
      if (!createdStreamId) {
        toast.error(getErrorMessage(err));
      } else {
        setUploadError("Video upload failed. Click the button to retry upload.");
      }
      console.error("Failed to create stream:", err);
    } finally {
      setIsSingleUploading(false);
    }
  };

  // ── Batch: add files ──
  const handleBatchFiles = useCallback((files: File[]) => {
    setBatchQueue((prev) => [...prev, ...files.map(makeBatchItem)]);
  }, []);

  // ── Batch: update single item ──
  const updateBatchItem = useCallback(
    (itemId: string, patch: Partial<BatchItem>) => {
      setBatchQueue((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, ...patch } : item,
        ),
      );
    },
    [],
  );

  // ── Batch: remove item ──
  const removeBatchItem = useCallback((itemId: string) => {
    setBatchQueue((prev) => prev.filter((item) => item.id !== itemId));
  }, []);

  // ── Batch: process one file ──
  const processBatchItem = useCallback(
    async (item: BatchItem): Promise<boolean> => {
      updateBatchItem(item.id, { status: "creating", progress: 0 });
      try {
        const stream = await createStream({
          title: item.title,
          description: "",
          tags: [],
          visibility: "public",
        }).unwrap();
        const streamId = stream.id;
        updateBatchItem(item.id, { streamId, status: "uploading" });

        const minChunkSize = 5 * 1024 * 1024;
        if (item.file.size < minChunkSize) {
          await uploadVideo({ id: streamId, file: item.file }).unwrap();
          updateBatchItem(item.id, { status: "done", progress: 100 });
        } else {
          await processUpload(streamId, item.file, (p) => {
            updateBatchItem(item.id, { progress: p });
          });
          updateBatchItem(item.id, { status: "done", progress: 100 });
        }
        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Upload failed";
        updateBatchItem(item.id, { status: "error", error: message });
        return false;
      }
    },
    [createStream, uploadVideo, processUpload, updateBatchItem],
  );

  // ── Batch: start upload ──
  const startBatchUpload = useCallback(async () => {
    const pendingItems = batchQueue.filter(
      (i) => i.status === "pending" || i.status === "error",
    );
    if (pendingItems.length === 0) return;

    setIsBatchRunning(true);
    setBatchComplete(false);
    setCountdown(10);
    batchAbortRef.current = false;

    const queue = [...pendingItems];
    const running: Promise<boolean>[] = [];

    const runNext = async (): Promise<boolean> => {
      if (batchAbortRef.current || queue.length === 0) return true;
      const item = queue.shift()!;
      const ok = await processBatchItem(item);
      if (!ok) return false;
      if (queue.length > 0 && !batchAbortRef.current) {
        return runNext();
      }
      return true;
    };

    for (
      let i = 0;
      i < Math.min(BATCH_CONCURRENCY, queue.length);
      i++
    ) {
      running.push(runNext());
    }

    const results = await Promise.all(running);
    setIsBatchRunning(false);
    if (!batchAbortRef.current && results.every(Boolean)) {
      setBatchComplete(true);
    }
  }, [batchQueue, processBatchItem]);

  // ── Batch: retry errors ──
  const retryFailed = useCallback(() => {
    setBatchQueue((prev) =>
      prev.map((item) =>
        item.status === "error"
          ? { ...item, status: "pending" as const, error: undefined, progress: 0 }
          : item,
      ),
    );
  }, []);

  // ── Batch: clear ──
  const clearBatch = useCallback(() => {
    if (isBatchRunning) return;
    setBatchQueue([]);
    setBatchComplete(false);
    setCountdown(10);
  }, [isBatchRunning]);

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold uppercase tracking-tighter mb-6">
        New Stream
      </h2>

      {/* Mode tabs */}
      <div className="flex gap-0 mb-4">
        {(["single", "batch"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              if (m === "single") {
                setBatchComplete(false);
                setCountdown(10);
              }
            }}
            disabled={isBatchRunning || isSingleLoading}
            className={cn(
              "px-4 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors border-4 border-b-0 border-foreground/20",
              mode === m
                ? "bg-primary text-primary-foreground border-foreground/20"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
          >
            {m === "single" ? "Single" : "Batch"}
          </button>
        ))}
      </div>

      <Card className="rounded-none border-4 border-foreground/20 shadow-[4px_4px_0_0_rgba(0,0,0,0.3)]">
        <CardHeader className="border-b-2 border-foreground/10 bg-muted/30">
          <CardTitle className="text-sm uppercase tracking-tight">
            {mode === "single" ? "Stream Details" : "Batch Upload"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* ═══════ SINGLE MODE ═══════ */}
          {mode === "single" && (
            <form onSubmit={handleSingleSubmit} className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <Label className="text-[10px] uppercase">Video</Label>
                <VideoDropzone
                  file={file}
                  onFileSelect={(f) => {
                    setFile(f);
                    if (f && !title) {
                      setTitle(f.name.replace(/\.[^.]+$/, ""));
                    }
                  }}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="title" className="text-[10px] uppercase">
                  Title
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="STREAM TITLE"
                  disabled={!!createdStreamId}
                  className={cn(inputClassName, "placeholder:opacity-30")}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="description" className="text-[10px] uppercase">
                  Description
                </Label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="DESCRIBE YOUR STREAM..."
                  rows={4}
                  disabled={!!createdStreamId}
                  className={cn(
                    "w-full bg-transparent px-3 py-2 text-sm",
                    "border-4 border-black rounded-none",
                    "focus-visible:outline-none focus-visible:border-primary",
                    "placeholder:opacity-30 placeholder:uppercase",
                    "resize-none",
                  )}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="tags" className="text-[10px] uppercase">
                  Tags
                </Label>
                <Input
                  id="tags"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  placeholder="TYPE AND PRESS ENTER"
                  disabled={!!createdStreamId}
                  className={cn(inputClassName, "placeholder:opacity-30")}
                />
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-bold uppercase"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="hover:text-destructive"
                        >
                          <X className="size-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-[10px] uppercase">Visibility</Label>
                <div className="flex gap-2">
                  {(["public", "private", "unlisted"] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      disabled={!!createdStreamId}
                      onClick={() => setVisibility(v)}
                      className={cn(
                        "px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors",
                        visibility === v
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80",
                      )}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              {uploadError && (
                <p className="text-[10px] uppercase font-bold text-destructive">
                  {uploadError}
                </p>
              )}

              {isMultipartUploading && <ProgressBar progress={progress} />}
              <Button
                type="submit"
                disabled={isSingleLoading || !title.trim()}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 rounded-none uppercase text-xs h-12"
              >
                {isSingleLoading
                  ? "Uploading..."
                  : createdStreamId
                    ? "Retry Upload"
                    : "Create Stream"}
              </Button>
            </form>
          )}

          {/* ═══════ BATCH MODE ═══════ */}
          {mode === "batch" && (
            <div className="flex flex-col gap-6">
              {/* Dropzone */}
              <VideoDropzone
                multiple
                onFilesSelected={handleBatchFiles}
                disabled={isBatchRunning}
              />

              {/* Queue */}
              {batchQueue.length > 0 && !batchComplete && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] uppercase">
                      Queue ({batchQueue.length} files)
                    </Label>
                    <div className="flex gap-2 text-[10px] uppercase font-bold">
                      {batchDoneCount > 0 && (
                        <span className="text-green-600">
                          {batchDoneCount} done
                        </span>
                      )}
                      {batchErrorCount > 0 && (
                        <span className="text-destructive">
                          {batchErrorCount} failed
                        </span>
                      )}
                      {batchActiveCount > 0 && (
                        <span className="text-blue-500">
                          {batchActiveCount} active
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="max-h-80 overflow-y-auto flex flex-col gap-1">
                    {batchQueue.map((item) => (
                      <div
                        key={item.id}
                        className="border-2 border-foreground/10 bg-muted/20 p-3"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Film className="size-4 text-muted-foreground shrink-0" />
                          <Input
                            value={item.title}
                            onChange={(e) =>
                              updateBatchItem(item.id, {
                                title: e.target.value,
                              })
                            }
                            disabled={
                              item.status === "creating" ||
                              item.status === "uploading" ||
                              item.status === "done"
                            }
                            className="border-0 bg-transparent h-auto p-0 text-xs font-bold uppercase tracking-tight focus-visible:ring-0 focus-visible:border-0"
                          />
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {formatFileSize(item.file.size)}
                          </span>

                          {/* Status icon */}
                          {item.status === "done" && (
                            <Check className="size-4 text-green-600 shrink-0" />
                          )}
                          {item.status === "error" && (
                            <AlertTriangle className="size-4 text-destructive shrink-0" />
                          )}

                          {/* Remove button (only when idle) */}
                          {item.status === "pending" && !isBatchRunning && (
                            <button
                              type="button"
                              onClick={() => removeBatchItem(item.id)}
                              className="shrink-0 p-0.5 hover:text-destructive transition-colors"
                            >
                              <X className="size-3" />
                            </button>
                          )}
                        </div>

                        {/* Progress bar */}
                        {(item.status === "uploading" ||
                          item.status === "done") && (
                          <ProgressBar progress={item.progress} />
                        )}

                        {/* Error message */}
                        {item.status === "error" && item.error && (
                          <p className="text-[10px] text-destructive mt-1">
                            {item.error}
                          </p>
                        )}

                        {/* Edit link after done */}
                        {item.status === "done" && item.streamId && (
                          <Link
                            to={`/streams/${item.streamId}/edit`}
                            className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline mt-1"
                          >
                            Edit metadata <ExternalLink className="size-3" />
                          </Link>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Overall progress */}
                  {(isBatchRunning || batchDoneCount > 0) && (
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">
                      {batchDoneCount}/{batchQueue.length} uploaded
                    </p>
                  )}
                </div>
              )}

              {/* Completion banner */}
              {batchComplete && (
                <div className="border-4 border-green-600 bg-green-600/10 p-6 text-center">
                  <Check className="size-10 mx-auto text-green-600 mb-3" />
                  <p className="text-sm font-bold uppercase">
                    All files uploaded successfully!
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    Redirecting to My Videos in {countdown}s...
                  </p>
                  <Button
                    type="button"
                    onClick={() => navigate("/streams/own")}
                    variant="outline"
                    className="mt-4 border-4 border-foreground/20 rounded-none uppercase text-xs h-10 px-4"
                  >
                    Go now
                  </Button>
                </div>
              )}

              {/* Actions */}
              {!batchComplete && (
              <div className="flex gap-2">
                {!isBatchRunning ? (
                  <>
                    <Button
                      type="button"
                      onClick={startBatchUpload}
                      disabled={
                        batchQueue.length === 0 ||
                        batchQueue.every(
                          (i) => i.status === "done" || i.status === "creating" || i.status === "uploading",
                        )
                      }
                      className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 rounded-none uppercase text-xs h-12"
                    >
                      {batchDoneCount > 0 ? "Start Upload" : "Start Upload"}
                    </Button>
                    {batchErrorCount > 0 && (
                      <Button
                        type="button"
                        onClick={retryFailed}
                        className="bg-yellow-500 text-black hover:bg-yellow-400 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 rounded-none uppercase text-xs h-12 px-4"
                      >
                        Retry Failed
                      </Button>
                    )}
                    <Button
                      type="button"
                      onClick={clearBatch}
                      disabled={batchQueue.length === 0}
                      variant="outline"
                      className="border-4 border-foreground/20 rounded-none uppercase text-xs h-12 px-4"
                    >
                      Clear
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    onClick={() => {
                      batchAbortRef.current = true;
                    }}
                    className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 rounded-none uppercase text-xs h-12"
                  >
                    Stop
                  </Button>
                )}
              </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
