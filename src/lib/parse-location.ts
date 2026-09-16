export interface LatLng {
  lat: number
  lng: number
}

export function parseLocation(location: string | undefined | null): LatLng | null {
  if (!location) return null

  const trimmed = location.trim()
  if (!trimmed) return null

  if (trimmed.includes(",")) {
    const parts = trimmed.split(",").map((p) => p.trim())
    if (parts.length !== 2) return null
    return withRanges(Number(parts[0]), Number(parts[1]))
  }

  return parseISO6709(trimmed)
}

// parseISO6709 parses a signed ISO 6709 coordinate string as written by
// cameras, e.g. "+55.0090+073.2981/" (decimal) or "+433037+0376176/"
// (packed DDDMMSS). Coordinate ranges are validated after parsing.
function parseISO6709(v: string): LatLng | null {
  const s = v.replace(/\/+$/, "").trim()
  if (!s) return null

  const lat = parseISO6709Axis(s)
  if (!lat.ok || !lat.rest) return null
  const lng = parseISO6709Axis(lat.rest)
  if (!lng.ok) return null

  return withRanges(lat.value, lng.value)
}

interface Axis {
  value: number
  rest: string
  ok: boolean
}

function parseISO6709Axis(s: string): Axis {
  if (!s) return { value: 0, rest: "", ok: false }

  let sign = 1
  if (s[0] === "+") {
    s = s.slice(1)
  } else if (s[0] === "-") {
    sign = -1
    s = s.slice(1)
  } else {
    return { value: 0, rest: "", ok: false }
  }

  const { token, rest } = takeUntilSign(s)
  if (!token) return { value: 0, rest, ok: false }

  if (token.includes(".")) {
    const num = Number(token)
    return Number.isFinite(num) ? { value: sign * num, rest, ok: true } : { value: 0, rest, ok: false }
  }

  const len = token.length
  let degStr: string
  let minStr: string
  let secStr: string
  if (len <= 3) {
    degStr = token
    minStr = "0"
    secStr = "0"
  } else if (len === 4) {
    degStr = token.slice(0, 2)
    minStr = token.slice(2)
    secStr = "0"
  } else {
    degStr = token.slice(0, len - 4)
    minStr = token.slice(len - 4, len - 2)
    secStr = token.slice(len - 2)
  }

  const deg = Number(degStr)
  const min = Number(minStr)
  const sec = Number(secStr)
  if (!Number.isFinite(deg) || !Number.isFinite(min) || !Number.isFinite(sec)) {
    return { value: 0, rest, ok: false }
  }
  return { value: sign * (deg + min / 60 + sec / 3600), rest, ok: true }
}

function takeUntilSign(s: string): { token: string; rest: string } {
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "+" || s[i] === "-") {
      return { token: s.slice(0, i), rest: s.slice(i) }
    }
  }
  return { token: s, rest: "" }
}

function withRanges(lat: number, lng: number): LatLng | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
  return { lat, lng }
}