import { useEffect, useRef, useState } from "react";
import { Download, Loader } from "pixelarticons/react";
import { toast } from "sonner";

import {
  useGetStreamExportQuery,
  useRequestStreamExportMutation,
} from "@/services/streams";
import {
  DEFAULT_FILE_NAME,
  downloadStreamExport,
} from "@/services/streamExportDownload";
import { cn } from "@/lib/utils";

const base =
  "inline-flex items-center justify-center cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 rounded-none uppercase text-xs h-9 font-bold";

/** The worker callback drives the transition; this only covers a dropped socket. */
const POLL_WHILE_PENDING_MS = 5000;

type Phase =
  | { kind: "idle" }
  | { kind: "requesting" }
  | { kind: "pending" }
  | { kind: "downloading" }
  | { kind: "ready" }
  | { kind: "failed"; reason: string };

/**
 * Requests the cached MP4 for a stream and saves it.
 *
 * The picker has to be opened from the click itself, before any await: Chromium
 * only grants a save dialog to a live user gesture, so fetching the status
 * first would leave us with no way to write the file. We therefore ask for the
 * handle up front and only create the file once the response is known to be
 * good, which means a failed request leaves nothing on disk.
 *
 * That same ordering decides the file name: the dialog is already open by the
 * time the download response arrives, so the name has to come from the status
 * we fetched earlier, not from the download's Content-Disposition. The server
 * therefore sends it as part of the export state.
 */
export function ExportDownloadButton({
  streamId,
  iconOnly = false,
  className,
  disabled = false,
}: {
  streamId: string;
  iconOnly?: boolean;
  className?: string;
  disabled?: boolean;
}) {
  const [requestExport] = useRequestStreamExportMutation();
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const abortRef = useRef<AbortController | null>(null);

  // RTK 2.11 types pollingInterval as a plain number, so the decision is made
  // from the last response instead of inside the options object. The socket
  // already announces the transition; this only covers a dropped one, which is
  // why it is slow and why it stops the moment the status moves on.
  const [polling, setPolling] = useState(0);
  const { data } = useGetStreamExportQuery(streamId, {
    pollingInterval: polling,
  });

  const serverStatus = data?.status;
  const requested = data?.requested ?? false;
  useEffect(() => {
    setPolling(
      requested && serverStatus === "pending" ? POLL_WHILE_PENDING_MS : 0,
    );
  }, [requested, serverStatus]);

  const effective: Phase =
    phase.kind === "downloading" || phase.kind === "requesting"
      ? phase
      : serverStatus === "ready"
        ? { kind: "ready" }
        : serverStatus === "failed" && requested
          ? { kind: "failed", reason: data?.error ?? "Export failed." }
          : serverStatus === "pending" && requested
            ? { kind: "pending" }
            : { kind: "idle" };

  const handleRequest = async () => {
    setPhase({ kind: "requesting" });
    try {
      await requestExport(streamId).unwrap();
      setPhase({ kind: "pending" });
      toast.success("Export started. We will email you when it is ready.");
    } catch (error) {
      setPhase({ kind: "idle" });
      toast.error(
        typeof error === "object" && error !== null && "data" in error
          ? describeApiError((error as { data?: { error?: string } }).data?.error)
          : "Could not start the export.",
      );
    }
  };

  const handleDownload = async () => {
    const controller = new AbortController();
    abortRef.current = controller;
    setPhase({ kind: "downloading" });
    try {
      let handle: FileSystemFileHandle | null = null;
      const showSaveFilePicker = window.showSaveFilePicker;
      if (showSaveFilePicker) {
        try {
          handle = await showSaveFilePicker({
            suggestedName: data?.file_name || DEFAULT_FILE_NAME,
            types: [
              {
                description: "MP4 video",
                accept: { "video/mp4": [".mp4"] },
              },
            ],
          });
        } catch (error) {
          // The user closed the save dialog; that is not a failure to report.
          if ((error as DOMException)?.name === "AbortError") {
            setPhase({ kind: "ready" });
            return;
          }
          throw error;
        }
      }

      const name = await downloadStreamExport(streamId, { handle });
      toast.success(`Saved ${name}`);
      setPhase({ kind: "ready" });
    } catch (error) {
      if ((error as Error)?.name === "AbortError") {
        setPhase({ kind: "ready" });
        return;
      }
      setPhase({ kind: "ready" });
      toast.error(
        error instanceof Error ? error.message : "Download failed.",
      );
    } finally {
      abortRef.current = null;
    }
  };

  const busy =
    effective.kind === "downloading" || effective.kind === "requesting";

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (busy || disabled) return;
    if (effective.kind === "ready") void handleDownload();
    else void handleRequest();
  };

  const label = {
    idle: "Export MP4",
    requesting: "Starting",
    pending: "Preparing",
    downloading: "Saving",
    ready: "Download",
    failed: "Retry",
  }[effective.kind];

  const title = {
    idle: "Build a single-file MP4 of this stream",
    requesting: "Starting the export",
    pending: "The MP4 is being built. We will email you when it is ready.",
    downloading: "Saving the file",
    ready: data?.size ? `Download the MP4 (${formatSize(data.size)})` : "Download the MP4",
    failed: effective.kind === "failed" ? effective.reason : undefined,
  }[effective.kind];

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy || disabled}
      aria-label={title}
      title={title}
      className={cn(
        base,
        iconOnly ? "w-9 shrink-0" : "px-3 sm:px-4 gap-2",
        effective.kind === "failed" && "bg-destructive text-destructive-foreground",
        className,
      )}
    >
      {busy ? <Loader className="size-5 animate-spin" /> : <Download className="size-5" />}
      {!iconOnly && <span className="hidden md:inline">{label}</span>}
    </button>
  );
}

function formatSize(bytes: number): string {
  const units = ["B", "KiB", "MiB", "GiB", "TiB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function describeApiError(message?: string): string {
  if (!message) return "Could not start the export.";
  return message.charAt(0).toUpperCase() + message.slice(1);
}
