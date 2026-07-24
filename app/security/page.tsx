import { redirect } from "next/navigation";
import { PasskeyManager, type AccountPasskey } from "@/components/passkey-manager";
import { PortalShell } from "@/components/portal-shell";
import { requirePageUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function SecurityPage() {
  const user = await requirePageUser();
  if (!user) redirect("/login?next=/security");
  if (user.role === "CUSTOMER") redirect("/account");

  const passkeys = await db.query<AccountPasskey>(
    `SELECT id,name,device_type AS "deviceType",backed_up AS "backedUp",created_at AS "createdAt",last_used_at AS "lastUsedAt"
     FROM passkeys WHERE user_id=$1 ORDER BY created_at DESC`,
    [user.id],
  );

  return (
    <PortalShell
      type={user.role === "ADMIN" ? "admin" : "delivery"}
      user={{ name: user.name, email: user.email, role: user.role }}
      title="Security"
      subtitle="Manage passwordless sign-in for this staff account"
    >
      <div className="mx-auto max-w-3xl">
        <PasskeyManager initialPasskeys={passkeys.rows} />
      </div>
    </PortalShell>
  );
}
