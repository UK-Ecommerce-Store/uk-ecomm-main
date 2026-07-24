"use client";

import Link from "next/link";
import { KeyRound, LogOut, Menu, Store, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Brand } from "@/components/brand";
import { ProfileAvatar } from "@/components/profile-avatar";

export function PortalShell({ type, user, title, subtitle, children }: {
  type: "admin" | "delivery";
  user: { name: string; email: string; role: string };
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    router.replace("/login");
    router.refresh();
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="w-fit rounded-lg bg-white px-3 py-2 text-[#151815]"><Brand compact /></div>
      <div className="mt-9 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center gap-3"><ProfileAvatar name={user.name} size="lg" /><div className="min-w-0"><p className="truncate text-sm font-semibold text-white">{user.name}</p><p className="mt-1 truncate text-xs text-white/45">{user.email}</p></div></div>
        <p className="mt-4 text-[10px] font-bold uppercase tracking-[.17em] text-white/35">{type === "admin" ? "Administrator" : "Delivery partner"}</p>
      </div>
      <div className="mt-auto space-y-2">
        <Link href="/security" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-white/65 transition-colors hover:bg-white/7 hover:text-white"><KeyRound size={17} /> Security & passkeys</Link>
        <Link href="/shop" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-white/65 transition-colors hover:bg-white/7 hover:text-white"><Store size={17} /> Open store</Link>
        <button type="button" onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-[#7fe092] transition-colors hover:bg-white/7"><LogOut size={17} /> Sign out</button>
      </div>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#f5faf3] lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="hidden min-h-screen bg-[#111512] p-5 text-white lg:block">{sidebar}</aside>
      <section className="min-w-0">
        <header className="sticky top-0 z-30 flex h-[72px] items-center gap-4 border-b border-black/6 bg-white/92 px-4 backdrop-blur-xl md:px-8">
          <motion.button whileTap={{ scale: .9 }} type="button" onClick={() => setOpen(true)} className="grid size-10 place-items-center rounded-xl border border-black/7 bg-white lg:hidden"><Menu size={19} /></motion.button>
          <div><h1 className="text-lg font-semibold tracking-[-.03em]">{title}</h1><p className="hidden text-xs text-[#85847d] sm:block">{subtitle}</p></div>
          <div className="ml-auto flex items-center gap-3"><div className="hidden text-right sm:block"><p className="text-xs font-semibold">{user.name}</p><p className="mt-0.5 text-[10px] uppercase tracking-[.12em] text-[#99978f]">{user.role}</p></div><ProfileAvatar name={user.name} /></div>
        </header>
        <div className="p-4 md:p-8">{children}</div>
      </section>
      <AnimatePresence>{open ? <><motion.button aria-label="Close menu" onClick={() => setOpen(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] lg:hidden" /><motion.aside initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "spring", stiffness: 360, damping: 34 }} className="fixed inset-y-0 left-0 z-50 w-[285px] bg-[#111512] p-5 text-white lg:hidden"><button type="button" onClick={() => setOpen(false)} className="absolute right-4 top-4 grid size-9 place-items-center rounded-full bg-white/10"><X size={17} /></button>{sidebar}</motion.aside></> : null}</AnimatePresence>
    </main>
  );
}
