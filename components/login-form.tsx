"use client";

import Link from "next/link";
import { KeyRound, LoaderCircle, LockKeyhole, Mail } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

function destinationFor(role: string, requested: string | null) {
  const fallback = role === "ADMIN" ? "/admin" : role === "DELIVERY" ? "/delivery" : "/account";
  return requested?.startsWith("/") && !requested.startsWith("//") ? requested : fallback;
}

export function LoginForm() {
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(false);
  const [passkeyLoading,setPasskeyLoading]=useState(false);
  const router=useRouter();
  const params=useSearchParams();

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setError("");
    try {
      const response=await fetch("/api/auth/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email,password})});
      const payload=await response.json();
      if(!response.ok){setError(payload.error??"Login failed");return;}
      router.replace(destinationFor(payload.user.role, params.get("next"))); router.refresh();
    } catch { setError("Could not reach the server. Check your connection and try again."); }
    finally { setLoading(false); }
  }

  async function signInWithPasskey() {
    setPasskeyLoading(true); setError("");
    try {
      const { browserSupportsWebAuthn, startAuthentication } = await import("@simplewebauthn/browser");
      if (!browserSupportsWebAuthn()) throw new Error("Passkeys are not supported by this browser or device.");
      const optionsResponse = await fetch("/api/auth/passkeys/authenticate/options", { cache: "no-store" });
      const optionsJSON = await optionsResponse.json();
      if (!optionsResponse.ok) throw new Error(optionsJSON.error ?? "Could not start passkey sign-in");
      const credential = await startAuthentication({ optionsJSON });
      const verifyResponse = await fetch("/api/auth/passkeys/authenticate/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(credential) });
      const result = await verifyResponse.json();
      if (!verifyResponse.ok || !result.verified) throw new Error(result.error ?? "Passkey verification failed");
      router.replace(destinationFor(result.user.role, params.get("next"))); router.refresh();
    } catch (passkeyError) {
      setError(passkeyError instanceof Error ? passkeyError.message : "Passkey sign-in failed");
    } finally { setPasskeyLoading(false); }
  }

  return <form onSubmit={submit} className="mt-8 space-y-4">
    <label className="block"><span className="text-xs font-black uppercase tracking-[.14em] text-[#7c847d]">Email</span><div className="mt-2 flex items-center gap-3 rounded-xl border border-[#dce5db] bg-white px-4"><Mail size={17} className="text-[#758078]"/><input required type="email" autoComplete="username webauthn" value={email} onChange={e=>setEmail(e.target.value)} className="h-13 w-full outline-none" placeholder="you@example.com"/></div></label>
    <label className="block"><span className="text-xs font-black uppercase tracking-[.14em] text-[#7c847d]">Password</span><div className="mt-2 flex items-center gap-3 rounded-xl border border-[#dce5db] bg-white px-4"><LockKeyhole size={17} className="text-[#758078]"/><input required type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} className="h-13 w-full outline-none" placeholder="Your password"/></div></label>
    {error&&<p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold leading-5 text-red-700">{error}</p>}
    <button disabled={loading || passkeyLoading} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#079a31] py-4 text-sm font-black text-white disabled:opacity-60">{loading&&<LoaderCircle size={17} className="animate-spin"/>} Sign in</button>
    <div className="flex items-center gap-3"><span className="h-px flex-1 bg-black/8"/><span className="text-[10px] font-bold uppercase tracking-[.14em] text-[#99978f]">or</span><span className="h-px flex-1 bg-black/8"/></div>
    <button type="button" onClick={() => void signInWithPasskey()} disabled={loading || passkeyLoading} className="flex w-full items-center justify-center gap-2 rounded-lg border border-black/10 bg-white py-4 text-sm font-black text-[#078d30] disabled:opacity-60">{passkeyLoading ? <LoaderCircle size={17} className="animate-spin"/> : <KeyRound size={17}/>} Sign in with passkey</button>
    <p className="text-center text-sm text-[#73736d]">New shopper? <Link href="/register" className="font-semibold text-[#078d30]">Create an account</Link></p>
  </form>;
}
