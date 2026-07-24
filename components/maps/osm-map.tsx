"use client";

import L from "leaflet";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import { useEffect, useMemo } from "react";

export interface MapPoint {
  id: string;
  position: [number, number];
  label: string;
  detail?: string;
  kind?: "store" | "driver" | "customer";
}

function FitBounds({ points }: { points: Array<[number, number]> }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 1) map.setView(points[0], 15);
    if (points.length > 1) map.fitBounds(points, { padding: [36, 36], maxZoom: 16 });
  }, [map, points]);
  return null;
}

function icon(kind: MapPoint["kind"]) {
  const glyph = kind === "store" ? "UK" : kind === "customer" ? "⌂" : "➤";
  const className = kind === "driver" ? "uk-map-marker uk-map-marker-driver" : kind === "customer" ? "uk-map-marker uk-map-marker-customer" : "uk-map-marker";
  return L.divIcon({ className: "", html: `<div class="${className}">${glyph}</div>`, iconSize: [40, 40], iconAnchor: [20, 20] });
}

export default function OsmMap({ points, path = [], className = "h-[430px]" }: { points: MapPoint[]; path?: Array<[number, number]>; className?: string }) {
  const allPoints = useMemo(() => [...points.map((p) => p.position), ...path], [points, path]);
  const center = allPoints[0] ?? [21.1702, 72.8311] as [number, number];
  return <div className={`overflow-hidden rounded-[22px] border border-black/8 bg-[#ecebe6] ${className}`}>
    <MapContainer center={center} zoom={13} className="h-full w-full" scrollWheelZoom>
      <TileLayer url={process.env.NEXT_PUBLIC_MAP_TILE_URL ?? "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"} attribution={process.env.NEXT_PUBLIC_MAP_ATTRIBUTION ?? "&copy; OpenStreetMap contributors"}/>
      {path.length>1&&<Polyline positions={path} pathOptions={{ color: "#191a17", weight: 4, opacity: .78 }}/>} 
      {points.map(point=><Marker key={point.id} position={point.position} icon={icon(point.kind)}><Popup><strong>{point.label}</strong>{point.detail&&<><br/>{point.detail}</>}</Popup></Marker>)}
      <FitBounds points={allPoints}/>
    </MapContainer>
  </div>;
}
