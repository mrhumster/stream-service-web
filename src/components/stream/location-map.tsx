import * as React from "react"
import * as L from "leaflet"
import "leaflet/dist/leaflet.css"

import type { LatLng } from "@/lib/parse-location"

const PIN_SVG = `<svg width="26" height="36" viewBox="0 0 24 36" xmlns="http://www.w3.org/2000/svg">
<path d="M20 13c0 6-8 12.5-8 12.5S4 19 4 13a8 8 0 0 1 16 0Z" fill="#ef4444" stroke="#1a1a18" stroke-width="1.5"/>
<circle cx="12" cy="13" r="3.2" fill="#1a1a18" opacity="0.85"/>
</svg>`

const PIN_ICON = L.divIcon({
  className: "gocast-pin",
  html: PIN_SVG,
  iconSize: [26, 36],
  iconAnchor: [13, 36],
  popupAnchor: [0, -32],
})

export function LocationMap({ lat, lng }: LatLng) {
  const containerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const map = L.map(el, {
      center: [lat, lng],
      zoom: 15,
      scrollWheelZoom: false,
      attributionControl: false,
    })

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map)

    L.marker([lat, lng], { icon: PIN_ICON }).addTo(map)

    const raf = requestAnimationFrame(() => map.invalidateSize())
    return () => {
      cancelAnimationFrame(raf)
      map.remove()
    }
  }, [lat, lng])

  return <div ref={containerRef} className="gocast-map z-0 h-full w-full" />
}