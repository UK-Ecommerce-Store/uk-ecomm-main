import { NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";

export async function GET(request: Request) {
  try {
    const user = await requireRequestUser(request, ["DELIVERY"]);
    const result = await db.query(`SELECT d.id,d.status,o.id AS "orderId",o.tracking_code AS "trackingCode",o.customer_name AS customer,o.customer_phone AS phone,
      concat_ws(', ',o.address_line1,o.address_line2,o.city,o.state,o.postal_code) AS address,o.total_paise/100.0 AS total,o.payment_method AS "paymentMethod",
      o.payment_status AS "paymentStatus",o.cod_collected_at AS "codCollectedAt",
      d.store_lat AS "storeLat",d.store_lng AS "storeLng",d.destination_lat AS "destinationLat",d.destination_lng AS "destinationLng",
      d.last_lat AS "lastLat",d.last_lng AS "lastLng",d.estimated_arrival AS "estimatedArrival",d.last_location_at AS "lastLocationAt"
      FROM deliveries d JOIN orders o ON o.id=d.order_id WHERE d.driver_id=$1 AND (d.status NOT IN ('DELIVERED','FAILED') OR d.updated_at >= now()-interval '30 days')
      ORDER BY CASE WHEN d.status IN ('DELIVERED','FAILED') THEN 1 ELSE 0 END,d.updated_at DESC,o.created_at DESC`, [user.id]);
    return NextResponse.json({ data: result.rows });
  } catch (error) { return apiError(error); }
}
