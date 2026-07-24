"use client";

import { AnimatePresence, motion } from "motion/react";
import { Minus, Plus, Search, ShoppingBag, SlidersHorizontal, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ProductMedia } from "@/components/product-media";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import type { CartItem, Category, Product } from "@/lib/contracts";

const CART_KEY = "uk_cart";

export function Shopfront({ products, categories, user }: { products: Product[]; categories: Category[]; user?: { name: string; role: string } | null }) {
  const params = useSearchParams();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartReady, setCartReady] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const requestedQuery = params.get("q") ?? "";
    const requestedCategory = params.get("category") ?? "all";
    setQuery(requestedQuery);
    setCategory(categories.some((entry) => entry.slug === requestedCategory) ? requestedCategory : "all");
    if (params.get("cart") === "open") setCartOpen(true);
  }, [params, categories]);

  useEffect(() => {
    try { setCart(JSON.parse(localStorage.getItem(CART_KEY) ?? "[]")); } catch { setCart([]); }
    setCartReady(true);
  }, []);
  useEffect(() => { if (cartReady) localStorage.setItem(CART_KEY, JSON.stringify(cart)); }, [cart, cartReady]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return products.filter((product) => {
      const categoryMatches = category === "all" || product.categorySlug === category;
      const searchText = `${product.name} ${product.category} ${product.description} ${product.sku}`.toLowerCase();
      return categoryMatches && (!needle || searchText.includes(needle));
    });
  }, [products, category, query]);

  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + (products.find((product) => product.id === item.productId)?.price ?? 0) * item.quantity, 0);

  function change(productId: string, delta: number) {
    const stock = products.find((product) => product.id === productId)?.stock ?? 0;
    setCart((current) => {
      const existing = current.find((item) => item.productId === productId);
      if (!existing && delta > 0 && stock > 0) return [...current, { productId, quantity: 1 }];
      return current.map((item) => item.productId === productId ? { ...item, quantity: Math.min(stock, Math.max(0, item.quantity + delta)) } : item).filter((item) => item.quantity > 0);
    });
  }

  return (
    <main className="min-h-screen bg-[#f7faf6]">
      <SiteHeader user={user} cartCount={count} onCartClick={() => setCartOpen(true)} onSearchClick={() => searchRef.current?.focus()} />

      <section className="border-b border-[#e5ebe4] bg-white">
        <div className="container-shell py-7 md:py-10">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div><p className="text-xs font-extrabold uppercase tracking-[.14em] text-[#079a31]">Live Surat catalog</p><h1 className="mt-2 text-4xl font-black tracking-[-.05em] md:text-5xl">Shop everything local.</h1><p className="mt-2 text-sm text-[#667067]">Live inventory, clear prices and quick doorstep delivery.</p></div>
            <label className="flex h-13 w-full items-center gap-3 rounded-xl border border-[#dce5db] bg-[#fbfdfb] px-4 shadow-[0_4px_18px_rgba(22,59,29,.04)] lg:max-w-lg">
              <Search size={18} className="text-[#6d766e]" />
              <input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} className="h-12 w-full bg-transparent text-sm outline-none" placeholder="Search products, categories or SKU…" />
              {query ? <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="grid size-8 place-items-center rounded-lg hover:bg-[#edf4ec]"><X size={15} /></button> : null}
            </label>
          </div>

          <div className="hide-scrollbar mt-7 flex gap-2 overflow-x-auto pb-1">
            <button type="button" onClick={() => setCategory("all")} className={`whitespace-nowrap rounded-lg border px-4 py-2.5 text-xs font-extrabold transition ${category === "all" ? "border-[#079a31] bg-[#079a31] text-white" : "border-[#dfe6df] bg-white text-[#3d473f] hover:border-[#bcd2c0]"}`}>All products</button>
            {categories.map((item) => <button type="button" key={item.id} onClick={() => setCategory(item.slug)} className={`whitespace-nowrap rounded-lg border px-4 py-2.5 text-xs font-extrabold transition ${category === item.slug ? "border-[#079a31] bg-[#079a31] text-white" : "border-[#dfe6df] bg-white text-[#3d473f] hover:border-[#bcd2c0]"}`}>{item.icon ? <span className="mr-1.5">{item.icon}</span> : null}{item.name}</button>)}
          </div>
        </div>
      </section>

      <section className="container-shell py-7 pb-16 md:py-10 md:pb-20">
        <div className="mb-5 flex items-center justify-between gap-4"><div className="flex items-center gap-2 text-xs font-semibold text-[#788179]"><SlidersHorizontal size={14}/><span>{filtered.length} {filtered.length === 1 ? "product" : "products"}</span></div>{query ? <span className="truncate text-xs text-[#788179]">Search: “{query}”</span> : <span className="text-xs font-semibold text-[#079a31]">Live stock</span>}</div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 md:gap-4 xl:grid-cols-4">
          {filtered.map((product, index) => {
            const quantity = cart.find((item) => item.productId === product.id)?.quantity ?? 0;
            const discount = product.mrp && product.mrp > product.price ? Math.round((1 - product.price / product.mrp) * 100) : 0;
            return (
              <motion.article key={product.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.018, .14) }} className="card-hover min-w-0 overflow-hidden rounded-xl border border-[#e2e9e1] bg-white shadow-[0_4px_16px_rgba(33,68,39,.035)]">
                <Link href={`/product/${product.slug}`} className="block p-2.5 pb-0 md:p-3 md:pb-0">
                  <div className="relative"><ProductMedia imageUrl={product.imageUrl} name={product.name} className="aspect-square rounded-lg md:aspect-[1.08]"/>{discount > 0 ? <span className="absolute left-2 top-2 rounded-md bg-[#e9f7d1] px-2 py-1 text-[9px] font-black text-[#247830]">{discount}% OFF</span> : null}{product.stock > 0 && product.stock <= 5 ? <span className="absolute right-2 top-2 rounded-md bg-white/95 px-2 py-1 text-[9px] font-bold text-[#b35e16] shadow">Only {product.stock} left</span> : null}</div>
                  <div className="px-1 pb-3 pt-3 md:px-2 md:pt-4"><p className="truncate text-[9px] font-extrabold uppercase tracking-[.12em] text-[#079a31] md:text-[10px]">{product.category}</p><h2 className="mt-1 line-clamp-2 min-h-10 text-sm font-bold leading-5 tracking-[-.015em] md:min-h-12 md:text-[16px] md:leading-6">{product.name}</h2><p className="mt-1 truncate text-[10px] text-[#7a837b] md:text-xs">{product.unit} · {product.stock} available</p></div>
                </Link>
                <div className="flex items-end justify-between gap-2 border-t border-[#edf1ec] px-3 py-3 md:px-4"><div className="min-w-0"><div><strong className="text-base font-black md:text-lg">₹{product.price}</strong>{product.mrp ? <span className="ml-1.5 text-[10px] text-[#9da49e] line-through md:text-xs">₹{product.mrp}</span> : null}</div><span className="hidden text-[9px] font-semibold text-[#798179] sm:block">incl. local taxes</span></div>{quantity === 0 ? <button type="button" disabled={product.stock === 0} onClick={() => change(product.id, 1)} className="min-w-[68px] rounded-lg border border-[#079a31] bg-white px-3 py-2 text-[10px] font-extrabold text-[#078d30] transition hover:bg-[#079a31] hover:text-white disabled:border-[#d7ddd7] disabled:text-[#9ca39d] disabled:hover:bg-white md:px-4 md:py-2.5 md:text-xs">{product.stock === 0 ? "Sold" : "ADD"}</button> : <div className="flex items-center gap-1 rounded-lg bg-[#079a31] p-1 text-white md:gap-2"><button type="button" onClick={() => change(product.id, -1)} className="grid size-7 place-items-center"><Minus size={13}/></button><span className="min-w-4 text-center text-[11px] font-extrabold">{quantity}</span><button type="button" disabled={quantity >= product.stock} onClick={() => change(product.id, 1)} className="grid size-7 place-items-center rounded-md bg-white text-[#079a31] disabled:opacity-50"><Plus size={13}/></button></div>}</div>
              </motion.article>
            );
          })}
        </div>

        {filtered.length === 0 ? <div className="mt-8 rounded-2xl border border-dashed border-[#bed0c0] bg-white p-12 text-center"><ShoppingBag className="mx-auto text-[#8da090]"/><h3 className="mt-4 text-xl font-black">No matching products</h3><p className="mt-2 text-sm text-[#6f786f]">Try another search term or category.</p></div> : null}
      </section>
      <SiteFooter />

      <AnimatePresence>{cartOpen ? <><motion.button aria-label="Close basket" onClick={() => setCartOpen(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[99980] bg-black/35 backdrop-blur-[2px]"/><motion.aside initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", bounce: 0, duration: .4 }} className="fixed inset-x-0 bottom-0 z-[99990] flex max-h-[88vh] flex-col rounded-t-2xl bg-white p-5 shadow-2xl md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:w-full md:max-w-md md:rounded-none">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-black/15 md:hidden"/>
        <div className="flex items-center justify-between border-b border-[#e8eee7] pb-4"><div><p className="text-xs font-extrabold uppercase tracking-[.14em] text-[#079a31]">Your cart</p><h2 className="mt-1 text-2xl font-black">{count} items</h2></div><button type="button" onClick={() => setCartOpen(false)} className="grid size-10 place-items-center rounded-lg border border-black/8 bg-white"><X size={18}/></button></div>
        <div className="mt-5 flex-1 space-y-3 overflow-y-auto pr-1">{cart.map((item) => { const product = products.find((entry) => entry.id === item.productId); if (!product) return null; return <div key={product.id} className="flex items-center gap-3 rounded-xl border border-[#e5ebe4] bg-[#fbfdfb] p-3"><ProductMedia imageUrl={product.imageUrl} name={product.name} className="size-16 shrink-0 rounded-lg"/><div className="min-w-0 flex-1"><strong className="block truncate text-sm font-bold">{product.name}</strong><span className="mt-1 block text-xs text-[#737d74]">₹{product.price} × {item.quantity}</span></div><div className="flex items-center gap-2 rounded-lg border border-[#dce5dc] bg-white p-1"><button type="button" onClick={() => change(product.id, -1)} className="grid size-7 place-items-center"><Minus size={13}/></button><strong className="w-4 text-center text-xs">{item.quantity}</strong><button type="button" onClick={() => change(product.id, 1)} className="grid size-7 place-items-center rounded-md bg-[#eef8ed] text-[#079a31]"><Plus size={13}/></button></div></div>; })}{cart.length === 0 ? <div className="grid min-h-56 place-items-center text-center"><div><span className="mx-auto grid size-14 place-items-center rounded-full bg-[#edf7ec] text-[#079a31]"><ShoppingBag size={24}/></span><h3 className="mt-4 font-black">Your cart is empty</h3><p className="mt-1 text-xs text-[#788178]">Add products to continue.</p></div></div> : null}</div>
        {cart.length > 0 ? <div className="border-t border-[#e5ebe4] pt-5"><div className="flex justify-between text-xl font-black"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div><p className="mt-2 text-xs text-[#748075]">Delivery is free on orders over ₹499.</p><Link href="/checkout" className="mt-5 block rounded-lg bg-[#079a31] py-4 text-center text-sm font-extrabold text-white">Continue to checkout</Link></div> : null}
      </motion.aside></> : null}</AnimatePresence>
    </main>
  );
}
