import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/admin-dashboard";
import { PortalShell } from "@/components/portal-shell";
import { requirePageUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export default async function AdminPage() {
  const user = await requirePageUser(["ADMIN"]);
  if (!user) redirect("/login?next=/admin");
  return (
    <PortalShell
      type="admin"
      user={user}
      title="UK Store administration"
      subtitle="Surat inventory, orders and live rider operations."
    >
      <AdminDashboard />
    </PortalShell>
  );
}
