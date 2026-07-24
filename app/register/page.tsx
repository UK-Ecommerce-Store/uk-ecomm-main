import { redirect } from "next/navigation";
import { MapPin, ShieldCheck, ShoppingBag } from "lucide-react";
import { Brand } from "@/components/brand";
import { RegisterForm } from "@/components/register-form";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export default async function RegisterPage() {
  const user = await currentUser();
  if (user) redirect(user.role === "CUSTOMER" ? "/shop" : user.role === "ADMIN" ? "/admin" : "/delivery");
  return <main className="min-h-screen bg-[#f5faf3]"><div className="grid min-h-screen lg:grid-cols-[1.05fr_.95fr]"><aside className="relative hidden overflow-hidden bg-[#111512] p-12 text-white lg:flex lg:flex-col lg:justify-between"><div className="absolute inset-0 opacity-20 store-grid-bg"/><div className="relative"><span className="inline-flex rounded-full bg-[#183b20] px-3 py-2 text-xs font-extrabold text-[#7fe092]">CREATE YOUR ACCOUNT</span><h2 className="mt-6 max-w-xl text-6xl font-black leading-[.98] tracking-[-.06em]">Made for<br/><span className="text-[#52d36c]">Surat shoppers.</span></h2><p className="mt-5 max-w-lg text-base leading-7 text-white/60">Save addresses, track every order and sign in with passkeys on supported devices.</p></div><div className="relative grid gap-3 sm:grid-cols-3">{[{Icon:ShoppingBag,label:"Order history"},{Icon:MapPin,label:"Saved addresses"},{Icon:ShieldCheck,label:"Passkeys"}].map(({Icon,label})=><div key={label} className="rounded-xl border border-white/10 bg-white/5 p-4"><Icon size={20} className="text-[#65d77a]"/><strong className="mt-6 block text-sm">{label}</strong></div>)}</div></aside><section className="flex items-center justify-center p-5 md:p-10"><div className="w-full max-w-lg rounded-2xl border border-[#dfe8de] bg-white p-7 shadow-[0_24px_70px_rgba(31,78,40,.09)] md:p-9"><Brand/><p className="mt-10 text-xs font-extrabold uppercase tracking-[.14em] text-[#079a31]">Customer account</p><h1 className="mt-3 text-4xl font-black tracking-[-.05em]">Join UK Store.</h1><p className="mt-3 text-sm leading-6 text-[#667067]">One account for faster checkout, saved Surat addresses and order tracking.</p><RegisterForm/></div></section></div></main>;
}
