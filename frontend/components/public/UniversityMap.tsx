"use client"

/**
 * 院校位置地图组件。
 * 使用 Leaflet 展示院校地理位置。
 */

import { useEffect, useState } from "react"

interface UniversityMapProps {
  latitude: number
  longitude: number
  name: string
}

/** Leaflet 地图组件 */
export function UniversityMap({ latitude, longitude, name }: UniversityMapProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className="h-[300px] w-full animate-pulse rounded-lg bg-gray-200" />
  }

  return <MapInner latitude={latitude} longitude={longitude} name={name} />
}

function MapInner({ latitude, longitude, name }: UniversityMapProps) {
  const [MapComponent, setMapComponent] = useState<React.ComponentType | null>(null)

  useEffect(() => {
    Promise.all([
      import("react-leaflet"),
      import("leaflet"),
      import("leaflet/dist/leaflet.css"),
    ]).then(([rl, L]) => {
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      })

      const { MapContainer, TileLayer, Marker, Popup } = rl

      const Comp = () => (
        <MapContainer
          center={[latitude, longitude]}
          zoom={13}
          style={{ height: "300px", width: "100%", borderRadius: "0.5rem" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={[latitude, longitude]}>
            <Popup>{name}</Popup>
          </Marker>
        </MapContainer>
      )
      setMapComponent(() => Comp)
    })
  }, [latitude, longitude, name])

  if (!MapComponent) {
    return <div className="h-[300px] w-full animate-pulse rounded-lg bg-gray-200" />
  }

  return <MapComponent />
}
