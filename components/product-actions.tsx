"use client";

import { ShoppingBag } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CartItem } from "@/lib/contracts";

const CART_KEY = "uk_cart";

export function ProductActions({ productId, stock }: { productId: string; stock: number }) {
  const router = useRouter();
  const [added, setAdded] = useState(false);

  function add() {
    const current: CartItem[] = JSON.parse(localStorage.getItem(CART_KEY) ?? "[]");
    const existing = current.find((item) => item.productId === productId);
    const next = existing
      ? current.map((item) => item.productId === productId ? { ...item, quantity: Math.min(stock, item.quantity + 1) } : item)
      : [...current, { productId, quantity: 1 }];
    localStorage.setItem(CART_KEY, JSON.stringify(next));
    setAdded(true);
    window.setTimeout(() => router.push("/shop?cart=open"), 450);
  }

  return <button type="button" disabled={stock < 1} onClick={add} className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#079a31] px-6 py-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"><ShoppingBag size={17} />{stock < 1 ? "Out of stock" : added ? "Added to basket" : "Add to basket"}</button>;
}
