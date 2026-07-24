"use client";

import Link from "next/link";
import { ChevronDown, Headphones, MapPin, Menu, Search, ShoppingCart, UserRound, X, Zap } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { FormEvent, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Brand } from "@/components/brand";
import { ProfileAvatar } from "@/components/profile-avatar";

const quickCategories = [
  ["Grocery", "grocery"], ["Electronics", "electronics"], ["Fashion", "fashion"],
  ["Home & Kitchen", "home-kitchen"], ["Beauty", "beauty"], ["Baby Care", "baby-care"],
  ["Sports", "sports"], ["Stationery", "stationery"],
] as const;

export function SiteHeader({
  cartCount = 0,
  onCartClick,
  user,
  onSearchClick,
}: {
  cartCount?: number;
  onCartClick?: () => void;
  user?: { name: string; role: string } | null;
  onSearchClick?: () => void;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState("");
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const accountHref = user?.role === "CUSTOMER" ? "/account" : user?.role === "ADMIN" ? "/admin" : user?.role === "DELIVERY" ? "/delivery" : "/login";
  const accountLabel = user?.role === "CUSTOMER" ? "My account" : user ? "Operations portal" : "Account";

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    const q = search.trim();
    router.push(q ? `/shop?q=${encodeURIComponent(q)}` : "/shop");
  }

  function categoryHref(slug: string) { return `/shop?category=${encodeURIComponent(slug)}`; }

  const mobileMenu = mounted ? createPortal(
    <AnimatePresence>
      {menuOpen ? <div className="fixed inset-0 z-[100000] lg:hidden">
        <motion.button aria-label="Close navigation" className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" onClick={() => setMenuOpen(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
        <motion.aside initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "spring", stiffness: 330, damping: 32 }} className="absolute inset-y-0 left-0 flex w-[88%] max-w-sm flex-col bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-black/7 p-5"><Brand compact /><motion.button whileTap={{ scale: .92 }} type="button" onClick={() => setMenuOpen(false)} className="grid size-10 place-items-center rounded-xl border border-black/8"><X size={18} /></motion.button></div>
          <div className="border-b border-black/7 bg-[#f5faf3] px-5 py-4"><div className="flex items-center gap-3"><MapPin size={18} className="text-[#079a31]"/><div><span className="block text-[10px] font-bold uppercase tracking-[.13em] text-[#788078]">Delivering to</span><strong className="text-sm">Surat, Gujarat</strong></div></div></div>
          {user ? <Link href={accountHref} onClick={() => setMenuOpen(false)} className="mx-5 mt-5 flex items-center gap-3 rounded-xl border border-[#dbe7db] bg-white p-3"><ProfileAvatar name={user.name} /><div className="min-w-0"><strong className="block truncate text-sm">{user.name}</strong><span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#7a827b]">{user.role.toLowerCase()}</span></div></Link> : null}
          <nav className="p-5">
            <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#8b938c]">Shop categories</p>
            <motion.div initial="closed" animate="open" variants={{ closed: {}, open: { transition: { staggerChildren: .035, delayChildren: .05 } } }} className="mt-2 grid grid-cols-2 gap-2">
              {quickCategories.map(([name, slug]) => <motion.div key={slug} variants={{ closed: { opacity: 0, y: 8 }, open: { opacity: 1, y: 0 } }}><Link href={categoryHref(slug)} onClick={() => setMenuOpen(false)} className="block rounded-xl border border-black/7 bg-[#fafcf9] px-3 py-3 text-sm font-semibold">{name}</Link></motion.div>)}
            </motion.div>
            <div className="mt-5 grid gap-1 border-t border-black/7 pt-4 text-sm font-semibold"><Link href="/shop" onClick={() => setMenuOpen(false)} className="py-3">All products</Link><Link href="/track" onClick={() => setMenuOpen(false)} className="py-3">Track order</Link><Link href={accountHref} onClick={() => setMenuOpen(false)} className="py-3">{accountLabel}</Link>{!user ? <Link href="/register" onClick={() => setMenuOpen(false)} className="py-3">Create account</Link> : null}</div>
          </nav>
          <div className="mt-auto bg-[#111512] p-5 text-white"><div className="flex items-center gap-2 text-sm font-bold"><Zap size={16} className="text-[#c7f44b]"/> Delivery within 2 Hrs or Less</div><p className="mt-2 text-xs leading-5 text-white/60">Serving supported 394xxx and 395xxx Surat postal codes.</p></div>
        </motion.aside>
      </div> : null}
    </AnimatePresence>, document.body,
  ) : null;

  return (
    <>
      <header className="sticky top-0 z-40 bg-white shadow-[0_1px_0_rgba(0,0,0,.08)]">
        <div className="bg-[#151715] text-white">
          <div className="container-shell flex h-9 items-center justify-between text-[11px] font-semibold">
            <span className="hidden items-center gap-2 sm:flex">🚚 Proudly delivering only in <strong className="text-[#38c85c]">Surat</strong></span>
            <span className="flex items-center gap-1.5"><Zap size={13} className="fill-[#ffd02d] text-[#ffd02d]"/> Delivery within 2 Hrs or Less</span>
            <div className="hidden items-center gap-5 lg:flex"><Link href="/track">Track Order</Link><span className="inline-flex items-center gap-1.5"><Headphones size={13}/> Help & Support</span></div>
          </div>
        </div>

        <div className="container-shell flex h-[72px] items-center gap-4 md:h-[84px]">
          <button type="button" onClick={() => setMenuOpen(true)} aria-label="Open navigation" className="grid size-10 shrink-0 place-items-center rounded-lg border border-black/8 lg:hidden"><Menu size={20}/></button>
          <div className="shrink-0"><Brand /></div>
          <div className="hidden min-w-[130px] items-center gap-2 border-l border-black/8 pl-4 xl:flex"><MapPin size={19} className="text-[#0b9632]"/><div><span className="block text-[10px] text-[#747b74]">Delivering to</span><strong className="flex items-center gap-1 text-sm">Surat <ChevronDown size={13}/></strong></div></div>
          <form onSubmit={submitSearch} className="ml-auto hidden h-12 flex-1 items-stretch overflow-hidden rounded-lg border border-[#dbe3db] bg-[#fbfdfb] md:flex md:max-w-[610px]">
            <input value={search} onChange={(e) => setSearch(e.target.value)} className="min-w-0 flex-1 bg-transparent px-4 text-sm outline-none" placeholder="Search for products..." aria-label="Search products"/>
            <button className="grid w-14 place-items-center bg-[#079a31] text-white" aria-label="Submit search"><Search size={21}/></button>
          </form>
          <div className="ml-auto flex items-center gap-1 md:ml-0 md:gap-2">
            <button type="button" onClick={() => { if (onSearchClick) onSearchClick(); else router.push("/shop"); }} aria-label="Search" className="grid size-10 place-items-center rounded-lg md:hidden"><Search size={20}/></button>
            <Link href={accountHref} className="hidden items-center gap-2 rounded-lg px-2 py-2 sm:flex"><UserRound size={21}/><span className="hidden text-sm font-semibold xl:inline">{accountLabel}</span></Link>
            <button type="button" onClick={() => onCartClick ? onCartClick() : router.push("/shop?cart=open")} aria-label="Open cart" className="relative flex h-10 items-center gap-2 rounded-lg px-2 text-sm font-semibold">
              <ShoppingCart size={22}/><span className="hidden xl:inline">Cart</span>{cartCount > 0 ? <motion.span key={cartCount} initial={{ scale: .6 }} animate={{ scale: 1 }} className="absolute right-0 top-0 grid min-w-5 place-items-center rounded-full bg-[#69bd20] px-1 text-[10px] font-extrabold text-white">{cartCount}</motion.span> : null}
            </button>
          </div>
        </div>

        <nav className="hidden border-t border-black/7 lg:block">
          <div className="container-shell flex h-14 items-center gap-2 overflow-x-auto text-sm font-semibold">
            <Link href="/" className="rounded-lg bg-[#079a31] px-5 py-2.5 text-white">Home</Link>
            {quickCategories.map(([name, slug]) => <Link key={slug} href={categoryHref(slug)} className="whitespace-nowrap rounded-lg px-4 py-2.5 transition hover:bg-[#eef7ed] hover:text-[#087e2c]">{name}</Link>)}
            <Link href="/shop" className="ml-auto whitespace-nowrap rounded-lg px-4 py-2.5">More</Link>
          </div>
        </nav>
      </header>
      {mobileMenu}
    </>
  );
}
