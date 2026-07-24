import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "UK Store — Surat's local store", template: "%s · UK Store" },
  description: "Everything Surat needs, with live inventory, local delivery and rider tracking.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" data-scroll-behavior="smooth"><body>{children}</body></html>;
}
