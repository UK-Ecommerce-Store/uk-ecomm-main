import { CheckoutForm } from "@/components/checkout-form";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import type { CustomerAddress } from "@/lib/contracts";

export const dynamic = "force-dynamic";
export default async function CheckoutPage() {
  const current = await currentUser();
  const customer = current?.role === "CUSTOMER" ? current : null;
  let addresses: CustomerAddress[] = [];
  if (customer) {
    const result = await db.query<CustomerAddress>(`SELECT id,label,address_line1 AS "addressLine1",address_line2 AS "addressLine2",city,state,postal_code AS "postalCode",
      latitude,longitude,is_default AS "isDefault" FROM customer_addresses WHERE user_id=$1 ORDER BY is_default DESC,updated_at DESC`, [customer.id]);
    addresses = result.rows;
  }
  return <main className="min-h-screen bg-[#f7faf6]"><SiteHeader user={current ? { name:current.name, role:current.role } : null}/><section className="container-shell py-8 md:py-12"><div className="mb-8 max-w-3xl"><p className="text-xs font-extrabold uppercase tracking-[.14em] text-[#079a31]">Secure checkout</p><h1 className="mt-3 text-4xl font-black tracking-[-.05em] md:text-5xl">Complete your Surat delivery.</h1>{!customer ? <p className="mt-3 text-sm text-[#667067]">Checkout as a guest, or <a href="/login?next=/checkout" className="font-extrabold text-[#078d30]">sign in</a> to use saved addresses and keep this order in your account.</p> : <p className="mt-3 text-sm text-[#667067]">Choose a saved address or enter another Surat delivery address.</p>}</div><CheckoutForm user={customer ? { name:customer.name,email:customer.email,phone:customer.phone } : null} addresses={addresses}/></section><SiteFooter/></main>;
}
