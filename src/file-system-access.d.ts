/**
 * `showSaveFilePicker` is not in TypeScript's DOM lib yet (it is in the WICG
 * File System Access spec, and only Chromium ships it). Declared narrowly here
 * rather than pulling in the whole @types/wicg-file-system-access package: the
 * app only needs to know the picker exists and what it hands back, and every
 * call site still has to feature-detect it.
 */
interface FilePickerType {
  description: string;
  accept: Record<string, string[]>;
}

interface SaveFilePickerOptions {
  suggestedName?: string;
  types?: FilePickerType[];
  excludeAcceptAllOption?: boolean;
}

interface Window {
  showSaveFilePicker?: (
    options?: SaveFilePickerOptions,
  ) => Promise<FileSystemFileHandle>;
}
