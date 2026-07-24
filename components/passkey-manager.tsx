"use client";

import { KeyRound, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useState } from "react";

export type AccountPasskey = { id: string; name: string; deviceType: string; backedUp: boolean; createdAt: string; lastUsedAt: string | null };

export function PasskeyManager({ initialPasskeys }: { initialPasskeys: AccountPasskey[] }) {
  const [passkeys, setPasskeys] = useState(initialPasskeys);
  const [name, setName] = useState("My passkey");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function addPasskey() {
    setBusy(true); setMessage("");
    try {
      const { browserSupportsWebAuthn, startRegistration } = await import("@simplewebauthn/browser");
      if (!browserSupportsWebAuthn()) throw new Error("Passkeys are not supported by this browser or device.");
      const optionsResponse = await fetch("/api/auth/passkeys/register/options", { cache: "no-store" });
      const optionsJSON = await optionsResponse.json();
      if (!optionsResponse.ok) throw new Error(optionsJSON.error ?? "Could not start passkey setup");
      const response = await startRegistration({ optionsJSON });
      const verifyResponse = await fetch("/api/auth/passkeys/register/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ response, name }) });
      const result = await verifyResponse.json();
      if (!verifyResponse.ok || !result.verified) throw new Error(result.error ?? "Passkey verification failed");
      const listResponse = await fetch("/api/account/passkeys", { cache: "no-store" });
      const list = await listResponse.json();
      if (listResponse.ok) setPasskeys(list.data ?? []);
      setMessage("Passkey added. You can now sign in without entering your password.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not add passkey");
    } finally { setBusy(false); }
  }

  async function remove(id: string) {
    if (!window.confirm("Remove this passkey?")) return;
    const response = await fetch(`/api/account/passkeys/${encodeURIComponent(id)}`, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok) { setMessage(result.error ?? "Could not remove passkey"); return; }
    setPasskeys((current) => current.filter((item) => item.id !== id));
  }

  return <section className="panel p-5 md:p-7"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#6f7d71]">Security</p><h2 className="mt-2 text-2xl font-semibold">Passkeys</h2><p className="mt-2 max-w-xl text-sm leading-6 text-[#74736c]">Use Face ID, Touch ID, Windows Hello or a security key to sign in. Your device keeps the private credential.</p></div><span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#e7f6e7]"><KeyRound size={19}/></span></div><div className="mt-5 flex flex-col gap-2 sm:flex-row"><input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} className="input-ui" placeholder="Passkey name"/><button type="button" onClick={() => void addPasskey()} disabled={busy} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-[#079a31] px-5 py-3 text-xs font-semibold text-white disabled:opacity-50"><Plus size={14}/>{busy ? "Waiting for device…" : "Add passkey"}</button></div>{message ? <p className="mt-3 rounded-xl bg-[#eef8ed] px-4 py-3 text-xs font-semibold text-[#2a6e3b]">{message}</p> : null}<div className="mt-5 space-y-2">{passkeys.map((passkey) => <div key={passkey.id} className="flex items-center gap-3 rounded-2xl border border-black/7 bg-white p-4"><span className="grid size-10 place-items-center rounded-xl bg-[#f1f7f0]"><ShieldCheck size={17}/></span><div className="min-w-0 flex-1"><strong className="block truncate text-sm">{passkey.name}</strong><span className="mt-1 block text-[10px] text-[#8a8982]">Added {new Date(passkey.createdAt).toLocaleDateString("en-IN")}{passkey.lastUsedAt ? ` · Last used ${new Date(passkey.lastUsedAt).toLocaleDateString("en-IN")}` : ""}</span></div><button type="button" onClick={() => void remove(passkey.id)} className="grid size-9 place-items-center rounded-lg border border-red-100 text-red-700"><Trash2 size={14}/></button></div>)}{passkeys.length === 0 ? <p className="rounded-2xl border border-dashed border-black/12 p-5 text-center text-xs text-[#85847d]">No passkeys registered yet.</p> : null}</div></section>;
}
