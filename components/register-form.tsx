"use client";

import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function RegisterForm() {
  const router = useRouter();
  const [error,setError] = useState("");
  const [loading,setLoading] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setLoading(true);
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirmPassword") ?? "");
    if (password !== confirm) { setError("Passwords do not match"); setLoading(false); return; }
    try {
      const response = await fetch("/api/auth/register", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({ name:form.get("name"), email:form.get("email"), phone:form.get("phone"), password }) });
      const payload = await response.json();
      if (!response.ok) { setError(payload.error ?? "Could not create account"); return; }
      router.replace("/shop"); router.refresh();
    } finally { setLoading(false); }
  }
  return <form onSubmit={submit} className="mt-8 space-y-4">
    <div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-semibold">Full name<input name="name" required autoComplete="name" className="input-ui mt-2" /></label><label className="text-xs font-semibold">Phone<input name="phone" required autoComplete="tel" className="input-ui mt-2" /></label></div>
    <label className="block text-xs font-semibold">Email<input name="email" type="email" required autoComplete="email" className="input-ui mt-2" /></label>
    <label className="block text-xs font-semibold">Password<input name="password" type="password" minLength={8} maxLength={72} required autoComplete="new-password" className="input-ui mt-2" /></label>
    <label className="block text-xs font-semibold">Confirm password<input name="confirmPassword" type="password" minLength={8} maxLength={72} required autoComplete="new-password" className="input-ui mt-2" /></label>
    {error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
    <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#079a31] py-4 text-sm font-semibold text-white disabled:opacity-60">{loading ? <LoaderCircle size={17} className="animate-spin" /> : null} Create account</button>
    <p className="text-center text-sm text-[#73736d]">Already registered? <Link href="/login" className="font-semibold text-[#078d30]">Sign in</Link></p>
  </form>;
}
