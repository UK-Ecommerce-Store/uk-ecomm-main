import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRequestUser } from "@/lib/auth";
import { db, withTransaction } from "@/lib/db";
import { apiError, assertSameOrigin, HttpError } from "@/lib/http";

const assignSchema = z.object({ orderId: z.uuid(), driverId: z.uuid(), etaMinutes: z.coerce.number().int().min(1).max(1440).default(30) });

export async function GET(request: Request) {
  try {
    await requireRequestUser(request, ["ADMIN"]);
    const result = await db.query(`SELECT d.id,d.order_id AS "orderId",o.tracking_code AS "trackingCode",o.customer_name AS customer,
      concat_ws(', ',o.address_line1,o.address_line2,o.city,o.state,o.postal_code) AS address,d.status,d.driver_id AS "driverId",u.name AS driver,
      d.last_lat AS "lastLat",d.last_lng AS "lastLng",d.last_location_at AS "lastLocationAt",d.estimated_arrival AS "estimatedArrival"
      FROM deliveries d JOIN orders o ON o.id=d.order_id LEFT JOIN users u ON u.id=d.driver_id ORDER BY d.updated_at DESC`);
    const drivers = await db.query(`SELECT id,name,email,phone,active FROM users WHERE role='DELIVERY' ORDER BY active DESC,name`);
    const unassigned = await db.query(`SELECT o.id,o.tracking_code AS "trackingCode",o.customer_name AS customer,o.city FROM orders o JOIN deliveries d ON d.order_id=o.id WHERE (d.driver_id IS NULL OR d.status='FAILED') AND o.status NOT IN ('CANCELLED','DELIVERED') ORDER BY o.created_at`);
    return NextResponse.json({ data: result.rows, drivers: drivers.rows, unassignedOrders: unassigned.rows });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const actor = await requireRequestUser(request, ["ADMIN"]);
    const input = assignSchema.parse(await request.json());
    const delivery = await withTransaction(async (client) => {
      const driver = await client.query("SELECT id FROM users WHERE id=$1 AND role='DELIVERY' AND active=true", [input.driverId]);
      if (!driver.rowCount) throw new HttpError(400, "Active delivery user not found");
      const result = await client.query(
        `UPDATE deliveries SET driver_id=$1,status='ASSIGNED',assigned_at=now(),estimated_arrival=now()+($2||' minutes')::interval
         WHERE order_id=$3 AND status<>'DELIVERED' AND EXISTS (SELECT 1 FROM orders o WHERE o.id=$3 AND o.status NOT IN ('CANCELLED','DELIVERED')) RETURNING id`, [input.driverId,input.etaMinutes,input.orderId],
      );
      if (!result.rowCount) throw new HttpError(404, "Delivery record not found");
      await client.query("UPDATE orders SET status=CASE WHEN status='PLACED' THEN 'CONFIRMED' ELSE status END WHERE id=$1", [input.orderId]);
      await client.query(`INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,metadata) VALUES ($1,'ASSIGN','DELIVERY',$2,$3)`, [actor.id,result.rows[0].id,JSON.stringify({ driverId: input.driverId, etaMinutes: input.etaMinutes })]);
      return result.rows[0];
    });
    return NextResponse.json({ data: delivery }, { status: 201 });
  } catch (error) { return apiError(error); }
}
