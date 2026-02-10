import { useState, type KeyboardEvent } from "react"
import { useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { VideoDropzone } from "@/components/video-dropzone"
import { useCreateStreamMutation, useUploadVideoMutation } from "@/services/streams"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"
import type { StreamVisibility } from "@/types/stream.types"

const inputClassName =
  "border-4 border-black rounded-none focus-visible:ring-0 focus-visible:border-primary"

export const CreateStreamPage = () => {
  const navigate = useNavigate()
  const [createStream, { isLoading: isCreating }] = useCreateStreamMutation()
  const [uploadVideo, { isLoading: isUploading }] = useUploadVideoMutation()
  const isLoading = isCreating || isUploading

  const [createdStreamId, setCreatedStreamId] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")
  const [visibility, setVisibility] = useState<StreamVisibility>("public")

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      const value = tagInput.trim().toLowerCase()
      if (value && !tags.includes(value)) {
        setTags([...tags, value])
      }
      setTagInput("")
    }
  }

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setUploadError(null)
    try {
      let streamId = createdStreamId
      if (!streamId) {
        const stream = await createStream({ title, description, tags, visibility }).unwrap()
        streamId = stream.id
        setCreatedStreamId(streamId)
      }
      if (file) {
        await uploadVideo({ id: streamId, file }).unwrap()
      }
      navigate(`/streams/${streamId}`)
    } catch (err) {
      if (createdStreamId) {
        setUploadError("Video upload failed. Click the button to retry upload.")
      }
      console.error("Failed to create stream:", err)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold uppercase tracking-tighter mb-6">
        New Stream
      </h2>

      <Card className="rounded-none border-4 border-foreground/20 shadow-[4px_4px_0_0_rgba(0,0,0,0.3)]">
        <CardHeader className="border-b-2 border-foreground/10 bg-muted/30">
          <CardTitle className="text-sm uppercase tracking-tight">
            Stream Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {/* Video */}
            <div className="flex flex-col gap-2">
              <Label className="text-[10px] uppercase">Video</Label>
              <VideoDropzone file={file} onFileSelect={(f) => {
                setFile(f)
                if (f && !title) {
                  setTitle(f.name.replace(/\.[^.]+$/, ""))
                }
              }} />
            </div>

            {/* Title */}
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

            {/* Description */}
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

            {/* Tags */}
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

            {/* Visibility */}
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

            {/* Error */}
            {uploadError && (
              <p className="text-[10px] uppercase font-bold text-destructive">
                {uploadError}
              </p>
            )}

            {/* Submit */}
            <Button
              type="submit"
              disabled={isLoading || !title.trim()}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 rounded-none uppercase text-xs h-12"
            >
              {isCreating ? "Creating..." : isUploading ? "Uploading..." : createdStreamId ? "Retry Upload" : "Create Stream"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
