import { eraseAuth, tokenReceived } from "../feature/auth/authSlice";
import { store } from "../store/store";
import type { LoginResponse } from "../types/auth.types";

/**
 * Streams the owner's MP4 straight to disk.
 *
 * This deliberately does not go through RTK Query: the response is a file, not
 * JSON, so a blob would be held in memory whole (a long stream easily exceeds
 * a gigabyte) and there would be no progress to show.
 */

/**
 * Used when the server suggests nothing: a name is still better than a file the
 * browser invents, and this one matches what the server falls back to for a
 * title that sanitizes down to nothing.
 */
export const DEFAULT_FILE_NAME = "stream.mp4";

/**
 * The DOM lib types `FileSystemFileHandle` but not the picker, and its
 * `createWritable` is only in some lib versions. Narrowing it here keeps the
 * call sites readable and documents exactly what the downloader relies on.
 */
export interface DownloadTarget {
  createWritable(): Promise<{
    write(chunk: unknown): Promise<void>;
    close(): Promise<void>;
    abort?(reason?: unknown): Promise<void>;
  }>;
}

/**
 * Reads the server's suggested name. We send `filename*` (percent-encoded
 * UTF-8) alongside a plain `filename`, so prefer the former and keep the
 * latter only for clients that ignore it.
 */
export function fileNameFromDisposition(header: string | null): string | null {
  if (!header) return null;

  const extended = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(header);
  if (extended?.[1]) {
    try {
      const decoded = decodeURIComponent(extended[1].trim());
      if (decoded) return sanitizeFileName(decoded);
    } catch {
      // Malformed escape: fall through to the plain parameter.
    }
  }

  const plain = /filename\s*=\s*"([^"]*)"|filename\s*=\s*([^;]+)/i.exec(
    header,
  );
  const raw = (plain?.[1] ?? plain?.[2] ?? "").trim();
  return raw ? sanitizeFileName(raw) : null;
}

const RESERVED_NAME_CHARS = '<>:"/\\|?*';

function sanitizeFileName(name: string): string {
  // The server already sanitizes, but this is only a suggestion to the save
  // dialog and the name becomes a path. Iterate by code point so a multi-byte
  // character is never split, and drop control characters too.
  const cleaned = Array.from(name)
    .map((char) => {
      const code = char.codePointAt(0) ?? 0;
      return code < 0x20 || RESERVED_NAME_CHARS.includes(char) ? "_" : char;
    })
    .join("")
    .trim();
  return cleaned || DEFAULT_FILE_NAME;
}

function authHeaders(): Headers {
  const headers = new Headers();
  const token = store.getState().auth.token;
  if (token) headers.set("authorization", `Bearer ${token}`);
  return headers;
}

/**
 * Builds an API URL by hand, the way the two calls below have to: the response
 * is a file, so it cannot go through RTK Query.
 *
 * The separator is added here rather than in the URL literals because
 * `VITE_API_URL` is configured without a trailing slash. RTK Query's `baseUrl`
 * joins its endpoints itself and hides the difference, but a plain template
 * literal does not, and a missing slash turns the host into a path segment:
 * `https://api.example.com` + `stream/<id>/download` is not a request the
 * server can route at all.
 */
function apiUrl(path: string): string {
  const base = (import.meta.env.VITE_API_URL as string).replace(/\/+$/, "");
  return `${base}/${path.replace(/^\/+/, "")}`;
}

/**
 * Fetches the export, refreshing the access token once on a 401. The refresh
 * uses a cookie and may rotate the token, so the retry reads it from the store
 * again rather than reusing the header we just sent.
 */
async function fetchExport(
  streamId: string,
  signal?: AbortSignal,
): Promise<Response> {
  const url = apiUrl(`stream/${streamId}/download`);
  let response = await fetch(url, {
    headers: authHeaders(),
    credentials: "include",
    signal,
  });

  if (response.status === 401) {
    const refreshed = await fetch(apiUrl("auth/refresh"), {
      method: "POST",
      credentials: "include",
    });
    if (refreshed.ok) {
      store.dispatch(tokenReceived((await refreshed.json()) as LoginResponse));
      response = await fetch(url, {
        headers: authHeaders(),
        credentials: "include",
        signal,
      });
    } else {
      store.dispatch(eraseAuth());
    }
  }

  return response;
}

async function responseError(response: Response): Promise<Error> {
  if (response.status === 401) {
    return new Error("Your session expired. Please sign in again.");
  }
  if (response.status === 404) {
    return new Error("The file is not ready yet.");
  }
  if (response.status === 403) {
    return new Error("You can only download your own streams.");
  }
  try {
    const body = (await response.json()) as { error?: string };
    if (body.error) return new Error(body.error);
  } catch {
    // Not JSON; fall through to the status text.
  }
  return new Error(`Download failed (HTTP ${response.status}).`);
}

export interface DownloadExportOptions {
  /** A file handle chosen by the user, or null when the API is unavailable. */
  handle?: DownloadTarget | FileSystemFileHandle | null;
  signal?: AbortSignal;
  onProgress?: (received: number, total: number) => void;
}

/**
 * Saves the export for `streamId` and reports the name it was saved under.
 *
 * `options.handle` must be acquired from the click handler that started the
 * download: the picker needs a user gesture, and awaiting a fetch first loses
 * it in Chromium.
 */
export async function downloadStreamExport(
  streamId: string,
  options: DownloadExportOptions = {},
): Promise<string> {
  const { handle, signal, onProgress } = options;
  const response = await fetchExport(streamId, signal);
  if (!response.ok) throw await responseError(response);

  const name =
    fileNameFromDisposition(response.headers.get("content-disposition")) ??
    DEFAULT_FILE_NAME;

  // Without a handle there is nowhere to stream to, so the body has to be
  // buffered. Fine for a typical clip, not for a multi-gigabyte stream.
  if (!handle) {
    const blob = await response.blob();
    saveViaAnchor(blob, name);
    return name;
  }

  const writable = await handle.createWritable();
  try {
    const body = response.body;
    if (body) {
      const reader = body.getReader();
      const total = Number(response.headers.get("content-length") ?? 0);
      let received = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        received += value.byteLength;
        onProgress?.(received, total);
        await writable.write(value);
      }
    } else {
      // No streaming body (older browsers, some proxies): write it in one go.
      const buffer = await response.arrayBuffer();
      onProgress?.(buffer.byteLength, buffer.byteLength);
      await writable.write(buffer);
    }
    await writable.close();
  } catch (error) {
    // Leave no half-written file behind when the transfer fails.
    await writable.abort?.(error).catch(() => undefined);
    throw error;
  }

  return name;
}

function saveViaAnchor(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoking immediately can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export const supportsSaveFilePicker = (): boolean =>
  typeof window.showSaveFilePicker === "function";
