import { redirect } from "next/navigation";
import { AccountPanel, type AccountOrder } from "@/components/account-panel";
import type { AccountPasskey } from "@/components/passkey-manager";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { requirePageUser } from "@/lib/auth";
import type { CustomerAddress } from "@/lib/contracts";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export default async function AccountPage() {
  const user = await requirePageUser(["CUSTOMER"]);
  if (!user) redirect("/login?next=/account");
  const [orders, addresses, passkeys] = await Promise.all([
    db.query<AccountOrder>(`SELECT o.id,o.tracking_code AS "trackingCode",o.status,o.payment_status AS "paymentStatus",o.total_paise/100.0 AS total,o.created_at AS "createdAt",
      coalesce((SELECT json_agg(json_build_object('name',oi.product_name,'quantity',oi.quantity,'unit',oi.unit) ORDER BY oi.created_at) FROM order_items oi WHERE oi.order_id=o.id),'[]'::json) AS items
      FROM orders o WHERE o.customer_user_id=$1 OR (o.customer_user_id IS NULL AND lower(o.customer_email)=lower($2)) ORDER BY o.created_at DESC LIMIT 100`, [user.id,user.email]),
    db.query<CustomerAddress>(`SELECT id,label,address_line1 AS "addressLine1",address_line2 AS "addressLine2",city,state,postal_code AS "postalCode",latitude,longitude,is_default AS "isDefault" FROM customer_addresses WHERE user_id=$1 ORDER BY is_default DESC,updated_at DESC`, [user.id]),
    db.query<AccountPasskey>(`SELECT id,name,device_type AS "deviceType",backed_up AS "backedUp",created_at AS "createdAt",last_used_at AS "lastUsedAt" FROM passkeys WHERE user_id=$1 ORDER BY created_at DESC`, [user.id]),
  ]);
  return <main className="min-h-screen bg-[#f7faf6]"><SiteHeader user={{ name:user.name, role:user.role }}/><section className="container-shell py-8 md:py-12"><div className="mb-7"><p className="text-xs font-extrabold uppercase tracking-[.14em] text-[#079a31]">Your UK Store account</p><h1 className="mt-2 text-4xl font-black tracking-[-.05em] md:text-5xl">Account & orders</h1><p className="mt-2 text-sm text-[#667067]">Manage saved delivery details, passkeys and your Surat order history.</p></div><AccountPanel user={{ name:user.name,email:user.email,phone:user.phone }} orders={orders.rows} addresses={addresses.rows} passkeys={passkeys.rows}/></section><SiteFooter/></main>;
}
