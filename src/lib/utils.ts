import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query/react"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatBytes(bytes: number): string {
  const units = ["B", "KiB", "MiB", "GiB", "TiB"]
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`
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
