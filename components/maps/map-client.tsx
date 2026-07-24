"use client";

import dynamic from "next/dynamic";
import type { MapPoint } from "@/components/maps/osm-map";

const OsmMap = dynamic(() => import("@/components/maps/osm-map"), { ssr: false, loading: () => <div className="grid h-[430px] place-items-center rounded-[22px] bg-[#ecebe6] text-sm font-semibold text-[#74736c]">Loading OpenStreetMap…</div> });

export function MapClient(props: { points: MapPoint[]; path?: Array<[number,number]>; className?: string }) { return <OsmMap {...props}/>; }
