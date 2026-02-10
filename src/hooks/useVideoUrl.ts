import { useEffect, useState } from "react"
import { useAuth } from "./useAuth"

export function useVideoUrl(streamId: string) {
  const { token } = useAuth()
  const [url, setUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setError("Not authenticated")
      setIsLoading(false)
      return
    }

    let revoked = false
    let objectUrl: string | null = null

    const fetchVideo = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch(
          `https://api.example.com/stream/${streamId}/download`,
          { headers: { Authorization: `Bearer ${token}` } },
        )

        if (!response.ok) {
          throw new Error(`Failed to load video (${response.status})`)
        }

        const blob = await response.blob()
        if (revoked) return

        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
      } catch (err) {
        if (!revoked) {
          setError(err instanceof Error ? err.message : "Failed to load video")
        }
      } finally {
        if (!revoked) setIsLoading(false)
      }
    }

    fetchVideo()

    return () => {
      revoked = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [streamId, token])

  return { url, isLoading, error }
}
