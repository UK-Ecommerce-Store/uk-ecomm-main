import { PackageSearch } from "lucide-react";
import { TrackSearchForm } from "@/components/track-search-form";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export default async function TrackOrderPage() {
  const user = await currentUser();
  return <main className="min-h-screen bg-[#f7faf6]"><SiteHeader user={user ? { name:user.name, role:user.role } : null}/><section className="container-shell py-12 md:py-18"><div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr] lg:items-center"><div><span className="grid size-12 place-items-center rounded-xl bg-[#e8f7e8] text-[#079a31]"><PackageSearch size={23}/></span><p className="mt-6 text-xs font-extrabold uppercase tracking-[.14em] text-[#079a31]">Live local delivery</p><h1 className="mt-3 text-5xl font-black leading-[1] tracking-[-.055em] md:text-6xl">Track your Surat order.</h1><p className="mt-5 max-w-xl text-base leading-7 text-[#667067]">Enter the tracking code shown after checkout. When your order has an assigned rider, live delivery information appears here.</p></div><div><TrackSearchForm/></div></div></section><SiteFooter/></main>;
}
