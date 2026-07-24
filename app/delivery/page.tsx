import { redirect } from "next/navigation";
import { DeliveryDashboard } from "@/components/delivery-dashboard";
import { PortalShell } from "@/components/portal-shell";
import { requirePageUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export default async function DeliveryPage(){const user=await requirePageUser(["DELIVERY"]);if(!user)redirect("/login?next=/delivery");return <PortalShell type="delivery" user={user} title="Delivery route" subtitle="Share live GPS and complete assigned stops."><DeliveryDashboard/></PortalShell>}
