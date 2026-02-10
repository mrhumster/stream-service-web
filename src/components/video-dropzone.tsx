import { useDropzone } from "react-dropzone"
import { Upload, X, Film } from "lucide-react"
import { cn } from "@/lib/utils"

interface VideoDropzoneProps {
  file: File | null
  onFileSelect: (file: File | null) => void
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function VideoDropzone({ file, onFileSelect }: VideoDropzoneProps) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "video/*": [] },
    maxFiles: 1,
    onDrop: (accepted) => {
      if (accepted.length > 0) {
        onFileSelect(accepted[0])
      }
    },
  })

  if (file) {
    return (
      <div className="border-4 border-foreground/30 rounded-none p-6 flex items-center gap-4">
        <Film className="size-10 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold uppercase tracking-tight truncate">
            {file.name}
          </p>
          <p className="text-[10px] uppercase text-muted-foreground">
            {formatFileSize(file.size)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onFileSelect(null)}
          className="shrink-0 p-1 border-2 border-foreground/20 hover:border-destructive hover:text-destructive transition-colors"
        >
          <X className="size-4" />
        </button>
      </div>
    )
  }

  return (
    <div
      {...getRootProps()}
      className={cn(
        "border-4 border-dashed rounded-none p-10 text-center cursor-pointer transition-colors",
        isDragActive
          ? "border-primary bg-primary/5"
          : "border-foreground/30 hover:border-primary",
      )}
    >
      <input {...getInputProps()} />
      <Upload className="size-10 mx-auto mb-3 text-muted-foreground" />
      <p className="text-sm font-bold uppercase tracking-tight">
        {isDragActive ? "Drop video here" : "Drag & drop video file"}
      </p>
      <p className="text-[10px] uppercase text-muted-foreground mt-1">
        or click to browse
      </p>
    </div>
  )
}
