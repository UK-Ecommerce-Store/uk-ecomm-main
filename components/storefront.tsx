"use client";

import { ArrowRight, Clock3, Headphones, MapPin, PackageCheck, RotateCcw, ShieldCheck, Store, Tag, Truck } from "lucide-react";
import Link from "next/link";
import { motion } from "motion/react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import type { Category } from "@/lib/contracts";

const categoryFallback = [
  { name: "Grocery", slug: "grocery", icon: "🥬" },
  { name: "Electronics", slug: "electronics", icon: "🎧" },
  { name: "Fashion", slug: "fashion", icon: "👕" },
  { name: "Home & Kitchen", slug: "home-kitchen", icon: "🍳" },
  { name: "Beauty", slug: "beauty", icon: "🧴" },
  { name: "Baby Care", slug: "baby-care", icon: "🧸" },
  { name: "Sports", slug: "sports", icon: "🏏" },
  { name: "Stationery", slug: "stationery", icon: "✏️" },
];

export default function Storefront({ user, categories }: { user?: { name: string; role: string } | null; categories: Category[] }) {
  const visibleCategories = (categories.length ? categories : categoryFallback).slice(0, 8);
  return (
    <main className="min-h-screen bg-white">
      <SiteHeader user={user} />

      <section className="relative overflow-hidden border-b border-[#e6ece5] bg-[#f6faf4]">
        <div className="container-shell grid min-h-[430px] items-stretch lg:grid-cols-[.9fr_1.1fr]">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .45 }} className="relative z-10 flex flex-col justify-center py-12 pr-6 lg:py-16">
            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-[#eef8d8] px-3 py-2 text-xs font-extrabold uppercase tracking-[.06em] text-[#247b32]"><MapPin size={14}/> Only in Surat</div>
            <h1 className="mt-7 max-w-[700px] text-[44px] font-black leading-[1.04] tracking-[-.055em] text-[#151815] sm:text-6xl lg:text-[64px]">Everything Surat Needs,<br/><span className="text-[#079a31]">Delivered in 2 Hrs or Less!</span></h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-[#4f5851] sm:text-lg">From groceries to gadgets, shop everyday essentials with live stock and local delivery across Surat.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/shop" className="inline-flex items-center gap-2 rounded-lg bg-[#079a31] px-7 py-4 text-sm font-extrabold text-white shadow-[0_10px_24px_rgba(7,154,49,.2)] transition hover:bg-[#07852b]">Shop Now <ArrowRight size={17}/></Link>
              <a href="#categories" className="inline-flex items-center gap-2 rounded-lg border border-[#9bcda7] bg-white px-7 py-4 text-sm font-extrabold text-[#172019]">Shop by Category</a>
            </div>
          </motion.div>

          <div className="surat-scene relative min-h-[330px] lg:min-h-[430px]">
            <div className="absolute left-[10%] top-[18%] h-24 w-2 rounded-full bg-[#32463a]/40"/>
            <div className="absolute left-[8.5%] top-[15%] size-9 rounded-full border-[7px] border-[#e84c3d] bg-white shadow-lg"/>
            <div className="absolute bottom-[20%] left-[15%] rounded-xl bg-white/90 px-4 py-3 shadow-xl backdrop-blur-sm"><span className="block text-[10px] font-extrabold uppercase tracking-[.13em] text-[#728078]">UK Store</span><strong className="mt-1 block text-sm">Fast local dispatch</strong></div>
          </div>
        </div>
      </section>

      <section className="container-shell relative -mt-5 z-10">
        <div className="grid gap-0 overflow-hidden rounded-2xl border border-[#e1e8e0] bg-white shadow-[0_16px_40px_rgba(32,69,39,.08)] sm:grid-cols-2 lg:grid-cols-4">
          {[
            { Icon: Truck, title: "2 Hrs or Less Delivery", copy: "Lightning fast delivery across Surat" },
            { Icon: ShieldCheck, title: "Trusted & Safe", copy: "Original products, clear prices" },
            { Icon: RotateCcw, title: "Easy Returns", copy: "Simple support for eligible items" },
            { Icon: Headphones, title: "Local Support", copy: "Surat based support team" },
          ].map(({ Icon, title, copy }, index) => <div key={title} className={`flex items-center gap-4 px-5 py-5 ${index ? "border-t border-[#e8ede7] sm:border-l sm:border-t-0" : ""}`}><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#edf8ec] text-[#079a31]"><Icon size={22}/></span><div><strong className="block text-sm">{title}</strong><span className="mt-1 block text-xs leading-5 text-[#687169]">{copy}</span></div></div>)}
        </div>
      </section>

      <section id="categories" className="container-shell py-10 md:py-14">
        <div className="mb-5 flex items-end justify-between gap-4"><div><p className="text-xs font-extrabold uppercase tracking-[.14em] text-[#079a31]">Browse fast</p><h2 className="mt-2 text-2xl font-black tracking-[-.035em] md:text-3xl">Shop by Category</h2></div><Link href="/shop" className="hidden items-center gap-2 text-sm font-extrabold text-[#078d30] sm:flex">View All Categories <ArrowRight size={15}/></Link></div>
        <div className="hide-scrollbar flex gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-4 xl:grid-cols-8">
          {visibleCategories.map((category, index) => {
            const entry = category as Category & { icon?: string };
            const fallback = categoryFallback[index % categoryFallback.length];
            return <motion.div key={entry.slug} whileHover={{ y: -4 }} className="min-w-[132px]"><Link href={`/shop?category=${encodeURIComponent(entry.slug)}`} className="block rounded-xl border border-[#e6ece5] bg-[#f8faf7] p-4 text-center transition hover:border-[#c8ddca] hover:bg-white"><span className="mx-auto grid size-20 place-items-center rounded-xl bg-white text-4xl shadow-[0_4px_15px_rgba(29,66,35,.06)]">{entry.icon || fallback.icon}</span><strong className="mt-3 block text-xs leading-4">{entry.name}</strong></Link></motion.div>;
          })}
        </div>
      </section>

      <section className="container-shell pb-14 md:pb-20">
        <div className="overflow-hidden rounded-2xl border border-[#dce7dc] bg-gradient-to-r from-[#f1f8ef] via-white to-[#f7fbf5]">
          <div className="grid lg:grid-cols-[330px_1fr]">
            <div className="flex items-center gap-5 border-b border-[#dce7dc] p-7 lg:border-b-0 lg:border-r"><div className="grid size-20 shrink-0 place-items-center rounded-full bg-[#079a31] text-4xl shadow-lg">🛵</div><div><h2 className="text-2xl font-black leading-tight tracking-[-.04em]">Why Shop with<br/><span className="text-[#079a31]">UK Store?</span></h2></div></div>
            <div className="grid sm:grid-cols-2 xl:grid-cols-4">
              {[
                { Icon: MapPin, title: "Only for Surat", copy: "We focus only on Surat for faster, more reliable delivery." },
                { Icon: Clock3, title: "2 Hrs or Less", copy: "Our promise: quick local delivery on supported orders." },
                { Icon: Tag, title: "Best Prices", copy: "Clear pricing and live inventory before you check out." },
                { Icon: Store, title: "Your Local Store", copy: "Built for Surat shoppers, deliveries and support." },
              ].map(({ Icon, title, copy }) => <div key={title} className="p-6"><Icon size={34} strokeWidth={1.7} className="text-[#079a31]"/><strong className="mt-4 block text-sm">{title}</strong><p className="mt-2 text-xs leading-5 text-[#657067]">{copy}</p></div>)}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[#e2e9e1] bg-[#f5faf3]">
        <div className="container-shell flex flex-col items-start justify-between gap-6 py-10 md:flex-row md:items-center"><div><span className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[.13em] text-[#078d30]"><PackageCheck size={15}/> Local commerce, simplified</span><h2 className="mt-2 text-3xl font-black tracking-[-.04em]">Need something today?</h2><p className="mt-2 text-sm text-[#667067]">Browse the live catalog and place your Surat order in minutes.</p></div><Link href="/shop" className="inline-flex items-center gap-2 rounded-lg bg-[#151815] px-7 py-4 text-sm font-extrabold text-white">Start shopping <ArrowRight size={16}/></Link></div>
      </section>
      <SiteFooter />
    </main>
  );
}
