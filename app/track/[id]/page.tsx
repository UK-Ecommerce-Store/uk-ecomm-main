import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { TrackingView } from "@/components/tracking-view";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export default async function TrackPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user] = await Promise.all([params, currentUser()]);
  return <main className="min-h-screen bg-[#f7faf6]"><SiteHeader user={user ? { name:user.name, role:user.role } : null}/><section className="container-shell py-8 md:py-12"><div className="mb-7"><p className="text-xs font-extrabold uppercase tracking-[.14em] text-[#079a31]">Live order tracking</p><h1 className="mt-2 break-all text-3xl font-black tracking-[-.04em] md:text-4xl">{id}</h1></div><TrackingView trackingCode={id}/></section><SiteFooter/></main>;
}
