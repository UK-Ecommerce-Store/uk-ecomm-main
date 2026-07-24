import Link from "next/link";
import { Headphones, MapPin, Truck } from "lucide-react";
import { Brand } from "@/components/brand";

export function SiteFooter() {
  return (
    <footer className="bg-[#111512] text-white">
      <div className="container-shell grid gap-9 py-12 md:grid-cols-[1.4fr_.7fr_.7fr_.9fr] md:py-14">
        <div><div className="inline-block rounded-lg bg-white px-3 py-2 text-[#151815]"><Brand /></div><p className="mt-5 max-w-sm text-sm leading-6 text-white/55">Surat&apos;s local online store for everyday essentials, live stock and trackable doorstep delivery.</p></div>
        <div><p className="text-xs font-extrabold uppercase tracking-[.14em] text-[#7fe092]">Shop</p><div className="mt-4 flex flex-col gap-3 text-sm font-semibold text-white/75"><Link href="/shop">All products</Link><Link href="/track">Track order</Link><Link href="/account">My account</Link></div></div>
        <div><p className="text-xs font-extrabold uppercase tracking-[.14em] text-[#7fe092]">Account</p><div className="mt-4 flex flex-col gap-3 text-sm font-semibold text-white/75"><Link href="/login">Sign in</Link><Link href="/register">Create account</Link><Link href="/security">Security</Link></div></div>
        <div><p className="text-xs font-extrabold uppercase tracking-[.14em] text-[#7fe092]">Local service</p><div className="mt-4 space-y-3 text-sm text-white/70"><p className="flex gap-2"><MapPin size={16} className="mt-0.5 shrink-0 text-[#6bd67e]"/> Surat, Gujarat · supported 394xxx / 395xxx areas</p><p className="flex gap-2"><Truck size={16} className="mt-0.5 shrink-0 text-[#6bd67e]"/> Fast local delivery with rider tracking</p><p className="flex gap-2"><Headphones size={16} className="mt-0.5 shrink-0 text-[#6bd67e]"/> Local support for orders and delivery</p></div></div>
      </div>
      <div className="border-t border-white/8 py-5"><div className="container-shell flex flex-col gap-2 text-xs text-white/40 sm:flex-row sm:justify-between"><span>© {new Date().getFullYear()} UK Store · Surat</span><span>Live inventory · Local rider tracking · COD</span></div></div>
    </footer>
  );
}
