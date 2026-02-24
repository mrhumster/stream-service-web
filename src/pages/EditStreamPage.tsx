import { useState, useEffect, type KeyboardEvent } from "react"
import { Link, useParams, useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useGetStreamQuery, useUpdateStreamMutation } from "@/services/streams"
import { useAppSelector } from "@/hooks"
import { cn } from "@/lib/utils"
import { ArrowLeft, Lock, X } from "lucide-react"
import type { StreamVisibility } from "@/types/stream.types"

const inputClassName =
  "border-4 border-black rounded-none focus-visible:ring-0 focus-visible:border-primary"

export const EditStreamPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const authUser = useAppSelector((state) => state.auth.authUser)
  const { data: stream, isLoading: isStreamLoading } = useGetStreamQuery(id!)
  const [updateStream, { isLoading: isUpdating }] = useUpdateStreamMutation()

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")
  const [visibility, setVisibility] = useState<StreamVisibility>("public")
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (stream && !initialized) {
      setTitle(stream.title)
      setDescription(stream.description)
      setTags(stream.tags ?? [])
      setVisibility(stream.visibility)
      setInitialized(true)
    }
  }, [stream, initialized])

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
    try {
      await updateStream({ id: id!, body: { title, description, visibility, tags } }).unwrap()
      navigate(`/streams/${id}`)
    } catch (err) {
      console.error("Failed to update stream:", err)
    }
  }

  if (isStreamLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="text-sm uppercase tracking-wider text-muted-foreground animate-pulse">
          Loading...
        </span>
      </div>
    )
  }

  if (!stream) {
    return (
      <div className="max-w-2xl mx-auto">
        <p className="text-sm uppercase text-destructive mb-4">
          Stream not found
        </p>
        <Link
          to="/streams"
          className="inline-flex items-center gap-2 text-xs uppercase text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to Streams
        </Link>
      </div>
    )
  }

  if (authUser?.id !== stream.owner_id) {
    return (
      <div className="max-w-2xl mx-auto flex flex-col items-center gap-4 py-20">
        <Lock className="size-10 text-muted-foreground" />
        <p className="text-sm uppercase tracking-wider text-muted-foreground">
          Access denied. Only the stream owner can edit.
        </p>
        <Link
          to={`/streams/${id}`}
          className="inline-flex items-center gap-2 text-xs uppercase text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to Stream
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Link
        to={`/streams/${id}`}
        className="inline-flex items-center gap-2 text-xs uppercase text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="size-4" />
        Back to Stream
      </Link>

      <h2 className="text-2xl font-bold uppercase tracking-tighter mb-6">
        Edit Stream
      </h2>

      <Card className="rounded-none border-4 border-foreground/20 shadow-[4px_4px_0_0_rgba(0,0,0,0.3)]">
        <CardHeader className="border-b-2 border-foreground/10 bg-muted/30">
          <CardTitle className="text-sm uppercase tracking-tight">
            Stream Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
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

            {/* Submit */}
            <Button
              type="submit"
              disabled={isUpdating || !title.trim()}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 rounded-none uppercase text-xs h-12"
            >
              {isUpdating ? "Updating..." : "Update Stream"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
