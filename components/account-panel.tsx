"use client";

import Link from "next/link";
import { LogOut, PackageCheck, ShoppingBag } from "lucide-react";
import { useRouter } from "next/navigation";
import { AccountAddresses } from "@/components/account-addresses";
import { PasskeyManager, type AccountPasskey } from "@/components/passkey-manager";
import type { CustomerAddress } from "@/lib/contracts";

export type AccountOrder = {
  id: string;
  trackingCode: string;
  status: string;
  paymentStatus: string;
  total: number;
  createdAt: string;
  items: Array<{ name: string; quantity: number; unit: string }>;
};

export function AccountPanel({ user, orders, addresses, passkeys }: {
  user: { name: string; email: string; phone: string | null };
  orders: AccountOrder[];
  addresses: CustomerAddress[];
  passkeys: AccountPasskey[];
}) {
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    router.replace("/");
    router.refresh();
  }
  return <div className="space-y-6">
    <section className="panel p-5 md:p-7"><div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#079a31]">Customer account</p><h1 className="mt-2 text-4xl font-semibold tracking-[-.05em]">{user.name}</h1><p className="mt-2 text-sm text-[#74736c]">{user.email}{user.phone ? ` · ${user.phone}` : ""}</p></div><button type="button" onClick={logout} className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#dce5db] bg-white px-5 py-3 text-xs font-semibold"><LogOut size={15} /> Sign out</button></div></section>
    <AccountAddresses initialAddresses={addresses}/>
    <PasskeyManager initialPasskeys={passkeys}/>
    <section><div className="mb-4 flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#6f7d71]">Orders</p><h2 className="mt-2 text-2xl font-semibold">Your order history</h2></div><Link href="/shop" className="inline-flex items-center gap-2 rounded-lg bg-[#079a31] px-4 py-2.5 text-xs font-semibold text-white"><ShoppingBag size={14}/> Shop</Link></div>
      <div className="space-y-3">{orders.map(order => <article key={order.id} className="panel p-5"><div className="flex flex-col gap-4 md:flex-row md:items-center"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><strong>{order.trackingCode}</strong><span className="status-pill">{order.status.replaceAll("_", " ")}</span><span className="status-pill">{order.paymentStatus}</span></div><p className="mt-2 text-xs text-[#85847d]">{new Date(order.createdAt).toLocaleString("en-IN")}</p><p className="mt-2 text-sm text-[#66655f]">{order.items.map(item => `${item.quantity}× ${item.name}`).join(", ")}</p></div><strong className="text-xl">₹{Number(order.total).toFixed(0)}</strong><Link href={`/track/${order.trackingCode}`} className="rounded-lg border border-[#dce5db] bg-white px-4 py-2.5 text-center text-xs font-semibold">Track order</Link></div></article>)}
        {orders.length === 0 ? <div className="panel p-10 text-center"><PackageCheck className="mx-auto text-[#6f7d71]"/><h3 className="mt-4 text-xl font-semibold">No orders yet</h3><p className="mt-2 text-sm text-[#77766f]">Orders placed while signed in will appear here.</p></div> : null}
      </div>
    </section>
  </div>;
}
