import type { Metadata } from "next";
import { Check, Clock3, MapPin, ShieldCheck, Truck } from "lucide-react";
import { notFound } from "next/navigation";
import { ProductActions } from "@/components/product-actions";
import { ProductMedia } from "@/components/product-media";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getProductBySlug } from "@/lib/catalog";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  return product ? { title: product.name, description: product.description } : { title: "Product not found" };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [product, user] = await Promise.all([getProductBySlug(slug), currentUser()]);
  if (!product) notFound();
  const discount = product.mrp && product.mrp > product.price ? Math.round((1 - product.price / product.mrp) * 100) : 0;

  return (
    <main className="min-h-screen bg-[#f7faf6]">
      <SiteHeader user={user ? { name: user.name, role: user.role } : null}/>
      <section className="container-shell py-7 md:py-12">
        <div className="mb-5 text-xs font-semibold text-[#748075]"><a href="/shop" className="text-[#078d30]">Shop</a> / {product.category} / {product.name}</div>
        <div className="grid overflow-hidden rounded-2xl border border-[#e0e8df] bg-white lg:grid-cols-2">
          <div className="relative bg-[#f5f8f4] p-4 md:p-7"><ProductMedia imageUrl={product.imageUrl} name={product.name} className="aspect-square rounded-xl border border-[#e4ebe3]"/>{discount > 0 ? <span className="absolute left-8 top-8 rounded-lg bg-[#e8f7d4] px-3 py-2 text-xs font-black text-[#247932]">{discount}% OFF</span> : null}</div>
          <div className="flex flex-col justify-center p-6 md:p-10 lg:p-12">
            <p className="text-xs font-extrabold uppercase tracking-[.13em] text-[#079a31]">{product.category} · {product.sku}</p>
            <h1 className="mt-4 text-4xl font-black leading-[1.03] tracking-[-.05em] md:text-6xl">{product.name}</h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-[#667067]">{product.description}</p>
            <div className="mt-7 flex flex-wrap items-end gap-3"><strong className="text-4xl font-black tracking-[-.035em]">₹{product.price}</strong><span className="pb-1 text-sm text-[#7d867e]">/ {product.unit}</span>{product.mrp ? <span className="pb-1 text-sm text-[#9ca39d] line-through">₹{product.mrp}</span> : null}</div>
            <div className="mt-3 inline-flex w-fit items-center gap-2 rounded-lg bg-[#eef8ed] px-3 py-2 text-xs font-extrabold text-[#26763a]"><Check size={15}/>{product.stock > 0 ? `${product.stock} units available` : "Currently unavailable"}</div>
            <ProductActions productId={product.id} stock={product.stock}/>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-3 rounded-xl border border-[#e1e9e0] p-4"><span className="grid size-10 place-items-center rounded-lg bg-[#edf8ed] text-[#079a31]"><Truck size={18}/></span><div><strong className="block text-sm">Local delivery</strong><span className="text-xs text-[#7a837b]">Surat only</span></div></div>
              <div className="flex items-center gap-3 rounded-xl border border-[#e1e9e0] p-4"><span className="grid size-10 place-items-center rounded-lg bg-[#edf8ed] text-[#079a31]"><Clock3 size={18}/></span><div><strong className="block text-sm">Fast dispatch</strong><span className="text-xs text-[#7a837b]">2 Hrs or Less target</span></div></div>
              <div className="flex items-center gap-3 rounded-xl border border-[#e1e9e0] p-4"><span className="grid size-10 place-items-center rounded-lg bg-[#edf8ed] text-[#079a31]"><ShieldCheck size={18}/></span><div><strong className="block text-sm">Live inventory</strong><span className="text-xs text-[#7a837b]">Database verified</span></div></div>
              <div className="flex items-center gap-3 rounded-xl border border-[#e1e9e0] p-4"><span className="grid size-10 place-items-center rounded-lg bg-[#edf8ed] text-[#079a31]"><MapPin size={18}/></span><div><strong className="block text-sm">Rider tracking</strong><span className="text-xs text-[#7a837b]">After assignment</span></div></div>
            </div>
          </div>
        </div>
      </section>
      <SiteFooter/>
    </main>
  );
}
