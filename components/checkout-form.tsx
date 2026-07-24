"use client";

import { Check, LoaderCircle, LocateFixed, MapPin, Plus, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { MapClient } from "@/components/maps/map-client";
import { ProductMedia } from "@/components/product-media";
import type { CartItem, CustomerAddress, Product } from "@/lib/contracts";
import { isInsideSurat } from "@/lib/service-area";

const CART_KEY = "uk_cart";

type AddressDraft = {
  addressLine1: string;
  addressLine2: string;
  postalCode: string;
};

const emptyAddress: AddressDraft = { addressLine1: "", addressLine2: "", postalCode: "" };

export function CheckoutForm({ user, addresses = [] }: {
  user?: { name: string; email: string; phone: string | null } | null;
  addresses?: CustomerAddress[];
}) {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const defaultAddress = addresses.find((address) => address.isDefault) ?? addresses[0] ?? null;
  const [selectedAddressId, setSelectedAddressId] = useState(defaultAddress?.id ?? "manual");
  const [address, setAddress] = useState<AddressDraft>(defaultAddress ? {
    addressLine1: defaultAddress.addressLine1,
    addressLine2: defaultAddress.addressLine2 ?? "",
    postalCode: defaultAddress.postalCode,
  } : emptyAddress);
  const [coords, setCoords] = useState<[number, number] | null>(defaultAddress?.latitude != null && defaultAddress.longitude != null ? [defaultAddress.latitude, defaultAddress.longitude] : null);
  const [saveAddress, setSaveAddress] = useState(false);
  const [addressLabel, setAddressLabel] = useState("Home");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    try { setCart(JSON.parse(localStorage.getItem(CART_KEY) ?? "[]")); } catch { setCart([]); }
    void fetch("/api/products", { cache: "no-store" }).then((response) => response.json()).then((payload) => setProducts(payload.data ?? []));
  }, []);

  const selected = useMemo(() => cart.map((item) => ({ item, product: products.find((product) => product.id === item.productId) })).filter((entry) => entry.product), [cart, products]);
  const subtotal = selected.reduce((sum, entry) => sum + entry.product!.price * entry.item.quantity, 0);
  const delivery = subtotal >= 499 ? 0 : 30;
  const selectedSavedAddress = addresses.find((item) => item.id === selectedAddressId) ?? null;

  function chooseAddress(id: string) {
    setError("");
    setSelectedAddressId(id);
    setSaveAddress(false);
    if (id === "manual") {
      setAddress(emptyAddress);
      setCoords(null);
      return;
    }
    const chosen = addresses.find((entry) => entry.id === id);
    if (!chosen) return;
    setAddress({ addressLine1: chosen.addressLine1, addressLine2: chosen.addressLine2 ?? "", postalCode: chosen.postalCode });
    setCoords(chosen.latitude != null && chosen.longitude != null ? [chosen.latitude, chosen.longitude] : null);
  }

  function updateAddress(field: keyof AddressDraft, value: string) {
    if (selectedAddressId !== "manual") {
      setSelectedAddressId("manual");
      setCoords(null);
    }
    setAddress((current) => ({ ...current, [field]: value }));
  }

  function locate() {
    setError("");
    if (!navigator.geolocation) { setError("Geolocation is unavailable in this browser."); return; }
    navigator.geolocation.getCurrentPosition((position) => {
      const point: [number, number] = [position.coords.latitude, position.coords.longitude];
      if (!isInsideSurat(...point)) { setError("Your current location is outside the Surat delivery area."); return; }
      setCoords(point);
      if (selectedAddressId !== "manual") setSelectedAddressId("manual");
    }, (geolocationError) => setError(geolocationError.message), { enableHighAccuracy: true, timeout: 15000 });
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!cart.length) { setError("Your basket is empty."); return; }
    if (saveAddress && !addressLabel.trim()) { setError("Give the new saved address a name such as Home or Office."); return; }
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const payload = {
      customerName: form.get("customerName"), customerEmail: form.get("customerEmail"), customerPhone: form.get("customerPhone"),
      addressId: selectedSavedAddress?.id ?? null,
      addressLabel: selectedSavedAddress?.label ?? (saveAddress ? addressLabel.trim() : null),
      saveAddress: Boolean(user && selectedAddressId === "manual" && saveAddress),
      addressLine1: address.addressLine1, addressLine2: address.addressLine2, city: "Surat", state: "Gujarat",
      postalCode: address.postalCode, paymentMethod: "COD", notes: form.get("notes"),
      destinationLat: coords?.[0] ?? null, destinationLng: coords?.[1] ?? null, items: cart,
    };
    const response = await fetch("/api/orders", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const result = await response.json();
    setLoading(false);
    if (!response.ok) { setError(result.error ?? "Could not place order"); return; }
    localStorage.removeItem(CART_KEY);
    router.push(`/track/${result.data.trackingCode}`);
  }

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1.12fr_.88fr]">
      <section className="panel p-5 md:p-7">
        <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.15em] text-[#079a31]">Address</p><h2 className="mt-2 text-2xl font-semibold tracking-[-.03em]">Delivery details</h2></div><span className="rounded-full bg-[#f1f7f0] px-3 py-2 text-xs font-semibold">Surat only</span></div>

        {user && addresses.length > 0 ? <div className="mt-6"><div className="mb-3 flex items-center justify-between"><strong className="text-sm">Choose a saved address</strong><span className="text-xs text-[#85847d]">{addresses.length} saved</span></div><div className="grid gap-2 sm:grid-cols-2">{addresses.map((item) => {
          const active = selectedAddressId === item.id;
          return <button key={item.id} type="button" onClick={() => chooseAddress(item.id)} className={`relative rounded-2xl border p-4 text-left transition ${active ? "border-[#079a31] bg-[#f3faf2]" : "border-[#e2e9e1] bg-white hover:border-[#bfd0c1]"}`}><div className="flex items-center justify-between gap-3"><strong className="text-sm">{item.label}</strong>{active ? <span className="grid size-6 place-items-center rounded-lg bg-[#079a31] text-white"><Check size={13}/></span> : null}</div><p className="mt-2 text-xs leading-5 text-[#74736c]">{item.addressLine1}{item.addressLine2 ? `, ${item.addressLine2}` : ""}<br/>{item.postalCode}</p>{item.isDefault ? <span className="mt-3 inline-block rounded-full bg-[#e7f6e7] px-2 py-1 text-[9px] font-bold uppercase tracking-[.12em]">Default</span> : null}</button>;
        })}<button type="button" onClick={() => chooseAddress("manual")} className={`flex min-h-[118px] items-center justify-center gap-2 rounded-2xl border border-dashed p-4 text-sm font-semibold ${selectedAddressId === "manual" ? "border-[#079a31] bg-[#f3faf2]" : "border-[#bfd0c1] bg-white"}`}><Plus size={16}/> Use another address</button></div></div> : null}

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-semibold">Full name<input name="customerName" required autoComplete="name" defaultValue={user?.name ?? ""} className="input-ui mt-2" /></label>
          <label className="text-xs font-semibold">Phone<input name="customerPhone" required inputMode="tel" autoComplete="tel" defaultValue={user?.phone ?? ""} className="input-ui mt-2" /></label>
          <label className="text-xs font-semibold sm:col-span-2">Email<input name="customerEmail" type="email" required autoComplete="email" defaultValue={user?.email ?? ""} readOnly={Boolean(user)} className="input-ui mt-2" /></label>
          <label className="text-xs font-semibold sm:col-span-2">House, building and street<input name="addressLine1" required autoComplete="address-line1" value={address.addressLine1} onChange={(event) => updateAddress("addressLine1", event.target.value)} className="input-ui mt-2" /></label>
          <label className="text-xs font-semibold sm:col-span-2">Area or landmark<input name="addressLine2" autoComplete="address-line2" value={address.addressLine2} onChange={(event) => updateAddress("addressLine2", event.target.value)} className="input-ui mt-2" /></label>
          <label className="text-xs font-semibold">City<input value="Surat" readOnly name="city" className="input-ui mt-2" /></label>
          <label className="text-xs font-semibold">State<input value="Gujarat" readOnly name="state" className="input-ui mt-2" /></label>
          <label className="text-xs font-semibold">Surat postal code<input name="postalCode" required inputMode="numeric" pattern="(394|395)[0-9]{3}" placeholder="395007" value={address.postalCode} onChange={(event) => updateAddress("postalCode", event.target.value)} className="input-ui mt-2" /></label>
          <label className="text-xs font-semibold">Payment<input value="Cash on delivery" readOnly className="input-ui mt-2" /></label>
          <label className="text-xs font-semibold sm:col-span-2">Delivery note<textarea name="notes" rows={3} className="input-ui mt-2 resize-none" /></label>
        </div>

        {user && selectedAddressId === "manual" ? <div className="mt-5 rounded-2xl border border-[#e2e9e1] bg-white p-4"><label className="flex cursor-pointer items-center gap-3 text-sm font-semibold"><input type="checkbox" checked={saveAddress} onChange={(event) => setSaveAddress(event.target.checked)} className="size-4"/> Save this address to my account</label>{saveAddress ? <label className="mt-4 block text-xs font-semibold">Address name<input value={addressLabel} onChange={(event) => setAddressLabel(event.target.value)} maxLength={40} placeholder="Home, Office, Parents…" className="input-ui mt-2"/></label> : null}</div> : null}

        <div className="mt-6 flex flex-col gap-3 rounded-2xl bg-[#f1f7f0] p-4 sm:flex-row sm:items-center"><MapPin size={19} /><div className="flex-1"><strong className="block text-sm font-semibold">Share the exact destination</strong><p className="mt-1 text-xs leading-5 text-[#73726b]">Optional, but it improves rider navigation and live tracking.</p></div><button type="button" onClick={locate} className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#dfe7dc] bg-white px-4 py-3 text-xs font-semibold"><LocateFixed size={15} /> Use current location</button></div>
        {coords ? <div className="mt-4"><MapClient className="h-[280px]" points={[{ id: "destination", position: coords, label: selectedSavedAddress?.label ?? "Delivery destination", kind: "customer" }]} /></div> : null}
      </section>

      <aside className="h-fit rounded-2xl bg-[#079a31] p-6 text-white lg:sticky lg:top-24">
        <p className="text-xs font-bold uppercase tracking-[.16em] text-white/45">Order summary</p>
        <div className="mt-5 space-y-3">{selected.map(({ item, product }) => <div key={item.productId} className="flex items-center gap-3 rounded-2xl bg-white/7 p-3"><ProductMedia imageUrl={product!.imageUrl} name={product!.name} className="size-12 shrink-0 rounded-xl" /><div className="min-w-0 flex-1"><strong className="block truncate text-sm font-semibold">{product!.name}</strong><span className="text-xs text-white/50">{item.quantity} × ₹{product!.price}</span></div><strong className="text-sm">₹{(item.quantity * product!.price).toFixed(2)}</strong></div>)}</div>
        <div className="mt-6 space-y-2 border-t border-white/10 pt-5 text-sm"><div className="flex justify-between text-white/60"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div><div className="flex justify-between text-white/60"><span>Delivery</span><span>{delivery ? `₹${delivery}` : "Free"}</span></div><div className="flex justify-between pt-2 text-xl font-semibold"><span>Total</span><span>₹{(subtotal + delivery).toFixed(2)}</span></div></div>
        {error ? <p className="mt-4 rounded-xl bg-red-400/15 px-4 py-3 text-sm font-semibold text-red-100">{error}</p> : null}
        <button disabled={loading || !cart.length} className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-white py-4 text-sm font-extrabold text-[#078d30] disabled:opacity-45">{loading ? <LoaderCircle size={17} className="animate-spin" /> : <ShieldCheck size={17} />} Place order</button>
      </aside>
    </form>
  );
}
