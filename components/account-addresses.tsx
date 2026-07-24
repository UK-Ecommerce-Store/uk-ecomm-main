"use client";

import { Check, Edit3, MapPin, Plus, Star, Trash2, X } from "lucide-react";
import { useState } from "react";
import type { CustomerAddress } from "@/lib/contracts";

const blank = { label: "Home", addressLine1: "", addressLine2: "", postalCode: "", isDefault: false };

export function AccountAddresses({ initialAddresses }: { initialAddresses: CustomerAddress[] }) {
  const [addresses, setAddresses] = useState(initialAddresses);
  const [editing, setEditing] = useState<CustomerAddress | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setError("");
    const form = new FormData(event.currentTarget);
    const payload = {
      label: form.get("label"), addressLine1: form.get("addressLine1"), addressLine2: form.get("addressLine2") || null,
      city: "Surat", state: "Gujarat", postalCode: form.get("postalCode"), latitude: null, longitude: null,
      isDefault: form.get("isDefault") === "on",
    };
    const response = await fetch(editing ? `/api/account/addresses/${editing.id}` : "/api/account/addresses", {
      method: editing ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload),
    });
    const result = await response.json();
    setSaving(false);
    if (!response.ok) { setError(result.error ?? "Could not save address"); return; }
    const next = result.data as CustomerAddress;
    setAddresses((current) => {
      const rows = editing ? current.map((item) => item.id === next.id ? next : item) : [next, ...current];
      return next.isDefault ? rows.map((item) => ({ ...item, isDefault: item.id === next.id })) : rows;
    });
    setOpen(false); setEditing(null);
  }

  async function remove(address: CustomerAddress) {
    if (!window.confirm(`Remove ${address.label}?`)) return;
    const response = await fetch(`/api/account/addresses/${address.id}`, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok) { setError(result.error ?? "Could not remove address"); return; }
    setAddresses((current) => {
      const rows = current.filter((item) => item.id !== address.id);
      if (address.isDefault && rows.length) rows[0] = { ...rows[0], isDefault: true };
      return rows;
    });
  }

  async function makeDefault(address: CustomerAddress) {
    const response = await fetch(`/api/account/addresses/${address.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({
      label: address.label, addressLine1: address.addressLine1, addressLine2: address.addressLine2, city: "Surat", state: "Gujarat", postalCode: address.postalCode,
      latitude: address.latitude, longitude: address.longitude, isDefault: true,
    }) });
    const result = await response.json();
    if (!response.ok) { setError(result.error ?? "Could not change default address"); return; }
    setAddresses((current) => current.map((item) => ({ ...item, isDefault: item.id === address.id })));
  }

  function edit(address?: CustomerAddress) {
    setEditing(address ?? null); setError(""); setOpen(true);
  }

  const initial = editing ? { label: editing.label, addressLine1: editing.addressLine1, addressLine2: editing.addressLine2 ?? "", postalCode: editing.postalCode, isDefault: editing.isDefault } : blank;

  return <section className="panel p-5 md:p-7">
    <div className="flex items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#6f7d71]">Addresses</p><h2 className="mt-2 text-2xl font-semibold">Saved delivery addresses</h2></div><button type="button" onClick={() => edit()} className="inline-flex items-center gap-2 rounded-lg bg-[#079a31] px-4 py-2.5 text-xs font-semibold text-white"><Plus size={14}/> Add address</button></div>
    {error ? <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
    <div className="mt-5 grid gap-3 md:grid-cols-2">{addresses.map((address) => <article key={address.id} className="rounded-2xl border border-black/7 bg-white p-4"><div className="flex items-start justify-between gap-4"><div className="flex min-w-0 items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#f1f7f0]"><MapPin size={17}/></span><div><div className="flex flex-wrap items-center gap-2"><strong className="text-sm">{address.label}</strong>{address.isDefault ? <span className="rounded-full bg-[#e7f6e7] px-2 py-1 text-[9px] font-bold uppercase tracking-[.1em]">Default</span> : null}</div><p className="mt-1 text-xs leading-5 text-[#74736c]">{address.addressLine1}{address.addressLine2 ? `, ${address.addressLine2}` : ""}, Surat, Gujarat {address.postalCode}</p></div></div></div><div className="mt-4 flex flex-wrap gap-2">{!address.isDefault ? <button type="button" onClick={() => void makeDefault(address)} className="inline-flex items-center gap-1.5 rounded-lg border border-[#dce5db] px-3 py-2 text-[10px] font-semibold"><Star size={12}/> Make default</button> : <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#f1f7f0] px-3 py-2 text-[10px] font-semibold"><Check size={12}/> Checkout default</span>}<button type="button" onClick={() => edit(address)} className="inline-flex items-center gap-1.5 rounded-lg border border-[#dce5db] px-3 py-2 text-[10px] font-semibold"><Edit3 size={12}/> Edit</button><button type="button" onClick={() => void remove(address)} className="inline-flex items-center gap-1.5 rounded-lg border border-red-100 px-3 py-2 text-[10px] font-semibold text-red-700"><Trash2 size={12}/> Remove</button></div></article>)}{addresses.length === 0 ? <div className="rounded-2xl border border-dashed border-black/15 p-8 text-center md:col-span-2"><MapPin className="mx-auto text-[#aaa89f]"/><h3 className="mt-3 font-semibold">No saved addresses</h3><p className="mt-1 text-xs text-[#85847d]">Save Home, Office or any other Surat address for faster checkout.</p></div> : null}</div>

    {open ? <><button aria-label="Close address editor" onClick={() => setOpen(false)} className="fixed inset-0 z-[80] bg-black/35 backdrop-blur-sm"/><div className="fixed inset-x-3 bottom-3 z-[90] rounded-2xl bg-white p-5 shadow-2xl sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-[520px] sm:-translate-x-1/2 sm:-translate-y-1/2"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#6f7d71]">Address book</p><h3 className="mt-2 text-2xl font-semibold">{editing ? "Edit address" : "New address"}</h3></div><button type="button" onClick={() => setOpen(false)} className="grid size-10 place-items-center rounded-full bg-white"><X size={17}/></button></div><form key={editing?.id ?? "new"} onSubmit={save} className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-xs font-semibold sm:col-span-2">Name<input name="label" defaultValue={initial.label} required maxLength={40} placeholder="Home / Office / etc" className="input-ui mt-2"/></label><label className="text-xs font-semibold sm:col-span-2">House, building and street<input name="addressLine1" defaultValue={initial.addressLine1} required className="input-ui mt-2"/></label><label className="text-xs font-semibold sm:col-span-2">Area or landmark<input name="addressLine2" defaultValue={initial.addressLine2} className="input-ui mt-2"/></label><label className="text-xs font-semibold">City<input value="Surat" readOnly className="input-ui mt-2"/></label><label className="text-xs font-semibold">Postal code<input name="postalCode" defaultValue={initial.postalCode} required pattern="(394|395)[0-9]{3}" className="input-ui mt-2"/></label><label className="flex items-center gap-2 text-xs font-semibold sm:col-span-2"><input type="checkbox" name="isDefault" defaultChecked={initial.isDefault} className="size-4"/> Use as my default checkout address</label>{error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 sm:col-span-2">{error}</p> : null}<button disabled={saving} className="rounded-lg bg-[#079a31] py-3.5 text-xs font-semibold text-white sm:col-span-2 disabled:opacity-50">{saving ? "Saving…" : "Save address"}</button></form></div></> : null}
  </section>;
}
