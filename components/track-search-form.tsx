"use client";

import { ArrowRight, PackageSearch } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function TrackSearchForm() {
  const [code, setCode] = useState("");
  const router = useRouter();
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = code.trim();
    if (normalized) router.push(`/track/${encodeURIComponent(normalized)}`);
  }
  return <form onSubmit={submit} className="mt-8 rounded-2xl border border-black/6 bg-white p-5 shadow-xl md:p-7">
    <label className="text-xs font-black uppercase tracking-[.16em] text-[#788179]" htmlFor="tracking-code">Tracking code</label>
    <div className="mt-3 flex flex-col gap-3 sm:flex-row">
      <div className="flex flex-1 items-center gap-3 rounded-2xl border border-black/8 px-4"><PackageSearch size={19}/><input id="tracking-code" value={code} onChange={(event)=>setCode(event.target.value)} required autoComplete="off" placeholder="UK-…" className="h-14 w-full bg-transparent font-bold uppercase outline-none"/></div>
      <button className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#153f2e] px-6 py-4 text-sm font-black text-white">Track order <ArrowRight size={17}/></button>
    </div>
  </form>;
}
