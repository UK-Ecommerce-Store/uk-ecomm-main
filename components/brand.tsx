import Link from "next/link";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="inline-flex items-center gap-2.5" aria-label="UK Store home">
      <span className="text-[28px] font-black leading-none tracking-[-.07em] text-[#101510]"><span className="text-[#079a31]">UK</span> STORE</span>
      {!compact ? <span className="hidden border-l border-black/10 pl-2.5 leading-none sm:block"><small className="block text-[8px] font-extrabold uppercase tracking-[.23em] text-[#687069]">Surat&apos;s local store</small><small className="mt-1 block text-[9px] font-semibold text-[#0b8f31]">2 hr delivery</small></span> : null}
    </Link>
  );
}
