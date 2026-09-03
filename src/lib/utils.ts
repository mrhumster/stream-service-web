import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query/react"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getErrorMessage(err: unknown): string {
  if (
    err &&
    typeof err === "object" &&
    "status" in err &&
    "data" in err
  ) {
    const fetchErr = err as FetchBaseQueryError
    const data = fetchErr.data
    if (data && typeof data === "object") {
      if ("error" in data && typeof data.error === "string") return data.error
      if ("message" in data && typeof data.message === "string")
        return data.message
      if ("detail" in data && typeof data.detail === "string") return data.detail
    }
    return `Request failed (${fetchErr.status})`
  }
  if (err instanceof Error) return err.message
  return "An unexpected error occurred"
}
