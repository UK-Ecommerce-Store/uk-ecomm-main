import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRequestUser } from "@/lib/auth";
import { withTransaction } from "@/lib/db";
import { apiError, assertSameOrigin, HttpError } from "@/lib/http";

const schema = z.object({ driverId: z.uuid().nullable().optional(), status: z.enum(["UNASSIGNED","ASSIGNED","PICKED_UP","ON_THE_WAY","DELIVERED","FAILED"]).optional(), etaMinutes: z.coerce.number().int().min(1).max(1440).optional() });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const actor = await requireRequestUser(request, ["ADMIN"]);
    const input = schema.parse(await request.json());
    const { id } = await params;
    await withTransaction(async (client) => {
      const current = await client.query<{ order_id: string }>("SELECT order_id FROM deliveries WHERE id=$1 FOR UPDATE", [id]);
      if (!current.rowCount) throw new HttpError(404, "Delivery not found");
      await client.query(`UPDATE deliveries SET driver_id=CASE WHEN $1::boolean THEN $2::uuid ELSE driver_id END,
        status=coalesce($3,status),estimated_arrival=CASE WHEN $4::int IS NOT NULL THEN now()+($4||' minutes')::interval ELSE estimated_arrival END,
        assigned_at=CASE WHEN $2::uuid IS NOT NULL AND assigned_at IS NULL THEN now() ELSE assigned_at END WHERE id=$5`,
        [Object.prototype.hasOwnProperty.call(input,"driverId"),input.driverId??null,input.status??null,input.etaMinutes??null,id]);
      if (input.status === "DELIVERED") await client.query("UPDATE orders SET status='DELIVERED',payment_status=CASE WHEN payment_method='COD' THEN 'PAID' ELSE payment_status END WHERE id=$1", [current.rows[0].order_id]);
      await client.query(`INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,metadata) VALUES ($1,'UPDATE','DELIVERY',$2,$3)`, [actor.id,id,JSON.stringify(input)]);
    });
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
