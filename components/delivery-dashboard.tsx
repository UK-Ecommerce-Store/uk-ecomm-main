"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  AlertCircle,
  Check,
  ChevronRight,
  Clock3,
  LocateFixed,
  MapPin,
  PackageCheck,
  Phone,
  RefreshCw,
  Route,
  Satellite,
  Truck,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapClient } from "@/components/maps/map-client";
import type { MapPoint } from "@/components/maps/osm-map";

type DeliveryStatus = "ASSIGNED" | "PICKED_UP" | "ON_THE_WAY" | "DELIVERED" | "FAILED";
type QueueTab = "QUEUE" | DeliveryStatus | "ALL";

type Assignment = {
  id: string;
  status: DeliveryStatus;
  orderId: string;
  trackingCode: string;
  customer: string;
  phone: string;
  address: string;
  total: number;
  paymentMethod: "COD" | "ONLINE";
  paymentStatus: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
  codCollectedAt: string | null;
  storeLat: number;
  storeLng: number;
  destinationLat: number | null;
  destinationLng: number | null;
  lastLat: number | null;
  lastLng: number | null;
  estimatedArrival: string | null;
  lastLocationAt: string | null;
};

const statusLabel: Record<DeliveryStatus, string> = {
  ASSIGNED: "Assigned",
  PICKED_UP: "Picked up",
  ON_THE_WAY: "On the way",
  DELIVERED: "Delivered",
  FAILED: "Failed",
};

const nextAction: Partial<Record<DeliveryStatus, { status: DeliveryStatus; label: string }>> = {
  ASSIGNED: { status: "PICKED_UP", label: "Confirm pickup" },
  PICKED_UP: { status: "ON_THE_WAY", label: "Start delivery" },
  ON_THE_WAY: { status: "DELIVERED", label: "Mark delivered" },
};

function distanceKm(a: [number, number], b: [number, number]) {
  const radians = (value: number) => value * Math.PI / 180;
  const dLat = radians(b[0] - a[0]);
  const dLng = radians(b[1] - a[1]);
  const lat1 = radians(a[0]);
  const lat2 = radians(b[0]);
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export function DeliveryDashboard() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [queueTab, setQueueTab] = useState<QueueTab>("QUEUE");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gpsActive, setGpsActive] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [codOpen, setCodOpen] = useState(false);
  const [cashAmount, setCashAmount] = useState("");
  const [currentPosition, setCurrentPosition] = useState<[number, number] | null>(null);
  const watchId = useRef<number | null>(null);
  const lastUploadAt = useRef(0);

  const loadAssignments = useCallback(async () => {
    try {
      const response = await fetch("/api/delivery/assignments", { cache: "no-store" });
      if (response.status === 401 || response.status === 403) {
        window.location.href = "/login?next=/delivery";
        return;
      }
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to load assignments");
      const rows = payload.data as Assignment[];
      setAssignments(rows);
      setSelectedId((current) => current && rows.some((item) => item.id === current)
        ? current
        : rows.find((item) => !["DELIVERED", "FAILED"].includes(item.status))?.id ?? rows[0]?.id ?? null);
    } catch (error) {
      setGpsError(error instanceof Error ? error.message : "Unable to load assignments");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => void loadAssignments(), 0);
    const timer = window.setInterval(() => void loadAssignments(), 20_000);
    return () => { window.clearTimeout(initial); window.clearInterval(timer); };
  }, [loadAssignments]);

  const active = assignments.find((item) => item.id === selectedId) ?? null;
  const activeStops = assignments.filter((item) => !["DELIVERED", "FAILED"].includes(item.status)).length;
  const completedStops = assignments.filter((item) => item.status === "DELIVERED").length;
  const queueTabs: Array<{ key: QueueTab; label: string }> = [
    { key: "QUEUE", label: "Queue" },
    { key: "ASSIGNED", label: "Assigned" },
    { key: "PICKED_UP", label: "Picked up" },
    { key: "ON_THE_WAY", label: "On the way" },
    { key: "DELIVERED", label: "Delivered" },
    { key: "FAILED", label: "Failed" },
    { key: "ALL", label: "All" },
  ];
  const filteredAssignments = assignments.filter((item) => queueTab === "ALL" ? true : queueTab === "QUEUE" ? !["DELIVERED", "FAILED"].includes(item.status) : item.status === queueTab);
  function selectQueueTab(next: QueueTab) {
    setQueueTab(next);
    const rows = assignments.filter((item) => next === "ALL" ? true : next === "QUEUE" ? !["DELIVERED", "FAILED"].includes(item.status) : item.status === next);
    if (!selectedId || !rows.some((item) => item.id === selectedId)) setSelectedId(rows[0]?.id ?? null);
  }

  const uploadPosition = useCallback(async (assignment: Assignment, position: GeolocationPosition) => {
    const now = Date.now();
    if (now - lastUploadAt.current < 8_000) return;
    lastUploadAt.current = now;
    const coordinates: [number, number] = [position.coords.latitude, position.coords.longitude];
    setCurrentPosition(coordinates);
    const response = await fetch("/api/delivery/location", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        deliveryId: assignment.id,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        heading: Number.isFinite(position.coords.heading) ? position.coords.heading : null,
        speed: Number.isFinite(position.coords.speed) ? position.coords.speed : null,
        capturedAt: new Date(position.timestamp).toISOString(),
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error ?? "Location update failed");
    setAssignments((current) => current.map((item) => item.id === assignment.id ? {
      ...item,
      lastLat: coordinates[0],
      lastLng: coordinates[1],
      lastLocationAt: new Date(position.timestamp).toISOString(),
    } : item));
  }, []);

  const stopGps = useCallback(() => {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
    setGpsActive(false);
  }, []);

  useEffect(() => stopGps, [stopGps]);

  function startGps() {
    if (!active || ["DELIVERED", "FAILED"].includes(active.status)) return;
    if (!("geolocation" in navigator)) {
      setGpsError("This browser does not support GPS location.");
      return;
    }
    setGpsError(null);
    stopGps();
    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        setGpsActive(true);
        void uploadPosition(active, position).catch((error) => {
          setGpsError(error instanceof Error ? error.message : "Location update failed");
        });
      },
      (error) => {
        setGpsActive(false);
        setGpsError(error.code === error.PERMISSION_DENIED
          ? "Location permission was denied. Allow precise location and try again."
          : "Unable to read the current location.");
      },
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 15_000 },
    );
  }

  async function updateStatus(status: DeliveryStatus, cash?: { cashCollected: boolean; collectedAmount: number }) {
    if (!active) return;
    setSaving(true);
    setGpsError(null);
    try {
      const response = await fetch(`/api/delivery/assignments/${active.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status, ...(cash ?? {}) }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "Unable to update delivery");
      if (["DELIVERED", "FAILED"].includes(status)) stopGps();
      await loadAssignments();
    } catch (error) {
      setGpsError(error instanceof Error ? error.message : "Unable to update delivery");
    } finally {
      setSaving(false);
    }
  }

  function advanceDelivery() {
    if (!active) return;
    const action = nextAction[active.status];
    if (!action) return;
    if (action.status === "DELIVERED" && active.paymentMethod === "COD" && active.paymentStatus !== "PAID") {
      setCashAmount(Number(active.total).toFixed(2));
      setCodOpen(true);
      return;
    }
    void updateStatus(action.status);
  }

  async function confirmCodCollection(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!active) return;
    const amount = Number(cashAmount);
    if (!Number.isFinite(amount) || Math.abs(amount - Number(active.total)) > 0.009) {
      setGpsError(`Enter the full COD amount: ₹${Number(active.total).toFixed(2)}`);
      return;
    }
    setCodOpen(false);
    await updateStatus("DELIVERED", { cashCollected: true, collectedAmount: amount });
  }

  const mapPoints = useMemo<MapPoint[]>(() => {
    if (!active) return [];
    const points: MapPoint[] = [{
      id: "store",
      position: [Number(active.storeLat), Number(active.storeLng)],
      label: process.env.NEXT_PUBLIC_STORE_NAME ?? "UK Store",
      detail: "Pickup location",
      kind: "store",
    }];
    const driver = currentPosition ?? (active.lastLat != null && active.lastLng != null ? [Number(active.lastLat), Number(active.lastLng)] as [number, number] : null);
    if (driver) points.push({ id: "driver", position: driver, label: "Your live location", detail: active.lastLocationAt ? new Date(active.lastLocationAt).toLocaleString() : "Live GPS", kind: "driver" });
    if (active.destinationLat != null && active.destinationLng != null) points.push({ id: "destination", position: [Number(active.destinationLat), Number(active.destinationLng)], label: active.customer, detail: active.address, kind: "customer" });
    return points;
  }, [active, currentPosition]);

  const path = useMemo<Array<[number, number]>>(() => mapPoints.map((point) => point.position), [mapPoints]);
  const driverPosition = currentPosition ?? (active?.lastLat != null && active?.lastLng != null ? [Number(active.lastLat), Number(active.lastLng)] as [number, number] : null);
  const remainingDistance = active && driverPosition && active.destinationLat != null && active.destinationLng != null
    ? distanceKm(driverPosition, [Number(active.destinationLat), Number(active.destinationLng)])
    : null;

  if (loading) return <div className="grid min-h-[420px] place-items-center rounded-[26px] bg-white"><RefreshCw className="animate-spin"/><span className="mt-3 text-sm font-bold">Loading assigned routes…</span></div>;

  return <div className="space-y-6">
    {gpsError && <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><AlertCircle size={18} className="mt-0.5 shrink-0"/><span>{gpsError}</span></div>}

    <div className="grid grid-cols-3 gap-2 sm:gap-4">
      <div className="rounded-[18px] bg-[#153f2e] p-3 text-white sm:rounded-[22px] sm:p-5"><div className="flex items-center justify-between"><span className="grid size-10 place-items-center rounded-2xl bg-white/10"><Route size={19}/></span><span className="text-[10px] font-black uppercase tracking-[.16em] text-[#c8f05a]">Live shift</span></div><p className="mt-5 text-xs font-bold text-white/45">Active stops</p><strong className="mt-1 block text-2xl">{activeStops}</strong></div>
      <div className="rounded-[18px] border border-black/6 bg-white p-3 sm:rounded-[22px] sm:p-5"><span className="grid size-10 place-items-center rounded-2xl bg-[#eef0e8] text-[#153f2e]"><PackageCheck size={19}/></span><p className="mt-5 text-xs font-bold text-[#858d86]">Completed today</p><strong className="mt-1 block text-2xl">{completedStops}</strong></div>
      <div className="rounded-[18px] border border-black/6 bg-white p-3 sm:rounded-[22px] sm:p-5"><span className={`grid size-10 place-items-center rounded-2xl ${gpsActive ? "bg-[#d8f0df] text-[#153f2e]" : "bg-[#eef0e8] text-[#858d86]"}`}><Satellite size={19}/></span><p className="mt-5 text-xs font-bold text-[#858d86]">GPS sharing</p><strong className="mt-1 block text-2xl">{gpsActive ? "Live" : "Off"}</strong></div>
    </div>

    {!active ? <section className="rounded-[26px] border border-black/6 bg-white p-10 text-center"><Check className="mx-auto text-[#27723c]" size={34}/><h2 className="mt-4 text-2xl font-black">No assigned deliveries</h2><p className="mt-2 text-sm text-[#7d857e]">New assignments from the admin portal will appear here automatically.</p></section> : <div className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
      <section className="order-2 space-y-3 xl:order-1">
        <MapClient points={mapPoints} path={path} className="h-[320px] sm:h-[470px]"/>
        <div className="flex flex-col gap-3 rounded-2xl border border-black/6 bg-white p-4 sm:flex-row sm:items-center">
          <div className="flex flex-1 items-center gap-3"><span className={`grid size-10 place-items-center rounded-full ${gpsActive ? "bg-[#d8f0df] text-[#153f2e]" : "bg-[#eef0e8]"}`}><LocateFixed size={18}/></span><div><strong className="block text-sm">{gpsActive ? "Precise location is being shared" : "Live tracking is stopped"}</strong><span className="text-xs text-[#7e867f]">GPS requires HTTPS outside localhost.</span></div></div>
          <button onClick={gpsActive ? stopGps : startGps} className={`rounded-full px-5 py-3 text-xs font-black ${gpsActive ? "border border-black/10 bg-white" : "bg-[#153f2e] text-white"}`}>{gpsActive ? "Stop GPS" : "Start GPS"}</button>
        </div>
      </section>

      <section className="order-1 rounded-[26px] border border-black/6 bg-white p-5 xl:order-2">
        <p className="text-xs font-black uppercase tracking-[.17em] text-[#8a918b]">Current delivery</p>
        <h2 className="mt-2 text-2xl font-black tracking-[-.04em]">{active.trackingCode}</h2>
        <div className="mt-6 rounded-2xl bg-[#f3f4ef] p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-[#858d86]">Customer</p><strong className="mt-1 block text-sm">{active.customer}</strong></div><a href={`tel:${active.phone}`} className="grid size-10 place-items-center rounded-full bg-white text-[#153f2e]"><Phone size={17}/></a></div><div className="mt-4 flex items-start gap-2 border-t border-black/6 pt-4 text-sm text-[#5f685f]"><MapPin size={16} className="mt-0.5 shrink-0"/><span>{active.address}</span></div></div>
        <div className="mt-5 grid grid-cols-3 gap-2 text-center"><div className="rounded-2xl border border-black/6 p-3"><p className="text-[10px] text-[#8d948e]">Distance</p><strong className="mt-1 block text-sm">{remainingDistance == null ? "—" : `${remainingDistance.toFixed(1)} km`}</strong></div><div className="rounded-2xl border border-black/6 p-3"><p className="text-[10px] text-[#8d948e]">Amount</p><strong className="mt-1 block text-sm">₹{Number(active.total).toFixed(0)}</strong></div><div className="rounded-2xl border border-black/6 p-3"><p className="text-[10px] text-[#8d948e]">Payment</p><strong className="mt-1 block text-sm">{active.paymentMethod}</strong><span className="mt-0.5 block text-[9px] text-[#929993]">{active.paymentStatus}</span></div></div>
        {active.paymentMethod === "COD" && active.paymentStatus !== "PAID" ? <div className="mt-5 rounded-2xl border border-[#d9dfc8] bg-[#f4f8e9] p-4"><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#6d774d]">Cash on delivery</p><div className="mt-2 flex items-end justify-between gap-3"><div><strong className="block text-2xl">₹{Number(active.total).toFixed(0)}</strong><span className="text-xs text-[#737b65]">Collect before marking delivered</span></div><span className="rounded-full bg-white px-3 py-2 text-[10px] font-black">PENDING</span></div></div> : null}
        <div className="mt-6"><div className="flex items-center justify-between text-xs font-bold"><span>Status</span><span className="text-[#27723c]">{statusLabel[active.status]}</span></div><div className="mt-3 grid grid-cols-4 gap-1">{["ASSIGNED","PICKED_UP","ON_THE_WAY","DELIVERED"].map((status,index)=>{const currentIndex=["ASSIGNED","PICKED_UP","ON_THE_WAY","DELIVERED"].indexOf(active.status);return <div key={status} className={`h-2 rounded-full ${index<=currentIndex?"bg-[#153f2e]":"bg-[#e7e9e4]"}`}/>})}</div></div>
        {active.estimatedArrival && <div className="mt-5 flex items-center gap-2 rounded-xl bg-[#f6f7f2] p-3 text-xs font-bold"><Clock3 size={15}/> ETA {new Date(active.estimatedArrival).toLocaleString()}</div>}
        {nextAction[active.status] && <button onClick={advanceDelivery} disabled={saving} className="mt-7 flex w-full items-center justify-center gap-2 rounded-full bg-[#c8f05a] py-4 text-sm font-black text-[#153f2e] disabled:opacity-50"><PackageCheck size={17}/>{saving ? "Saving…" : nextAction[active.status]!.label}</button>}
        {!["DELIVERED","FAILED"].includes(active.status) && <button onClick={()=>void updateStatus("FAILED")} disabled={saving} className="mt-2 w-full rounded-full border border-red-200 py-3 text-xs font-black text-red-700 disabled:opacity-50">Report failed delivery</button>}
      </section>
    </div>}

    <section className="rounded-[26px] border border-black/6 bg-white p-5 md:p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-[.17em] text-[#8a918b]">Queue</p><h2 className="mt-2 text-xl font-black">Delivery history & assignments</h2></div><button onClick={()=>void loadAssignments()} className="grid size-10 place-items-center rounded-full bg-[#edf1e7]"><RefreshCw size={16}/></button></div>
      <div className="hide-scrollbar mt-5 flex gap-2 overflow-x-auto pb-1">{queueTabs.map((item) => { const count = item.key === "ALL" ? assignments.length : item.key === "QUEUE" ? assignments.filter((row) => !["DELIVERED","FAILED"].includes(row.status)).length : assignments.filter((row) => row.status === item.key).length; return <button type="button" key={item.key} onClick={() => selectQueueTab(item.key)} className={`whitespace-nowrap rounded-full px-4 py-2.5 text-[11px] font-black transition ${queueTab === item.key ? "bg-[#153f2e] text-white" : "border border-black/7 bg-[#f8f8f4] text-[#697169]"}`}>{item.label} <span className={`ml-1 ${queueTab === item.key ? "text-[#c8f05a]" : "text-[#9aa09a]"}`}>{count}</span></button> })}</div>
      <div className="mt-4 space-y-3"><AnimatePresence mode="popLayout">{filteredAssignments.map((delivery,index)=><motion.button type="button" onClick={()=>setSelectedId(delivery.id)} layout key={delivery.id} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={{delay:Math.min(index*.025,.15)}} className={`flex w-full flex-col gap-4 rounded-2xl border p-4 text-left sm:flex-row sm:items-center ${selectedId===delivery.id?"border-[#153f2e] bg-[#f8faf5]":"border-black/6"}`}><span className={`grid size-11 shrink-0 place-items-center rounded-2xl ${delivery.status==="DELIVERED"?"bg-[#e5f7e8] text-[#27723c]":delivery.status==="FAILED"?"bg-red-50 text-red-700":"bg-[#edf1e7] text-[#153f2e]"}`}>{delivery.status==="DELIVERED"?<Check size={18}/>:delivery.status==="FAILED"?<AlertCircle size={18}/>:<Truck size={18}/>}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><strong className="text-sm">{delivery.trackingCode}</strong><span className="rounded-full bg-[#f1f2ed] px-2 py-1 text-[9px] font-black uppercase tracking-[.1em]">{statusLabel[delivery.status]}</span></div><p className="mt-1 truncate text-xs text-[#7f8780]">{delivery.customer} · {delivery.address}</p></div><div className="flex items-center justify-between gap-5 sm:justify-end"><div className="text-right"><strong className="block text-sm">₹{Number(delivery.total).toFixed(0)}</strong><span className="text-[10px] text-[#929993]">{delivery.lastLocationAt ? new Date(delivery.lastLocationAt).toLocaleTimeString() : delivery.status === "DELIVERED" ? "Completed" : "GPS pending"}</span></div><ChevronRight size={16}/></div></motion.button>)}</AnimatePresence>{filteredAssignments.length===0?<div className="rounded-2xl border border-dashed border-black/12 p-8 text-center text-sm text-[#858d86]">No deliveries in this category.</div>:null}</div></section>
 

    <AnimatePresence>{codOpen && active ? <><motion.button aria-label="Close cash collection" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={()=>setCodOpen(false)} className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm"/><motion.div initial={{y:40,opacity:0}} animate={{y:0,opacity:1}} exit={{y:40,opacity:0}} className="fixed inset-x-3 bottom-3 z-[100] rounded-[26px] bg-[#fbfaf7] p-5 shadow-2xl sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-[440px] sm:-translate-x-1/2 sm:-translate-y-1/2"><div className="mx-auto mb-4 h-1 w-10 rounded-full bg-black/15 sm:hidden"/><p className="text-xs font-black uppercase tracking-[.16em] text-[#8a918b]">COD collection</p><h2 className="mt-2 text-2xl font-black tracking-[-.04em]">Collect ₹{Number(active.total).toFixed(0)}</h2><p className="mt-2 text-sm leading-6 text-[#6f776f]">Confirm that the full cash amount has been received from {active.customer}. Completing this step marks the order as paid and delivered.</p><form onSubmit={confirmCodCollection} className="mt-5"><label className="text-xs font-black">Amount received<input autoFocus value={cashAmount} onChange={(event)=>setCashAmount(event.target.value)} inputMode="decimal" type="number" step="0.01" min="0" className="input-ui mt-2 text-lg font-black"/></label><div className="mt-5 grid grid-cols-2 gap-2"><button type="button" onClick={()=>setCodOpen(false)} className="rounded-full border border-black/10 bg-white py-3 text-xs font-black">Cancel</button><button disabled={saving} className="rounded-full bg-[#c8f05a] py-3 text-xs font-black text-[#153f2e] disabled:opacity-50">{saving?"Saving…":"Cash collected"}</button></div></form></motion.div></> : null}</AnimatePresence>
  </div>;
}
