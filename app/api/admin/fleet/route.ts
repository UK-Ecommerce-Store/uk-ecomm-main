import { NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";

export async function GET(request: Request) {
  try {
    await requireRequestUser(request, ["ADMIN"]);
    const result = await db.query(`SELECT d.id,o.tracking_code AS "trackingCode",d.status,u.id AS "driverId",u.name AS driver,u.phone,
      d.store_lat AS "storeLat",d.store_lng AS "storeLng",d.destination_lat AS "destinationLat",d.destination_lng AS "destinationLng",
      d.last_lat AS "lastLat",d.last_lng AS "lastLng",d.last_location_at AS "lastLocationAt",d.estimated_arrival AS "estimatedArrival"
      FROM deliveries d JOIN orders o ON o.id=d.order_id LEFT JOIN users u ON u.id=d.driver_id
      WHERE d.status IN ('ASSIGNED','PICKED_UP','ON_THE_WAY') ORDER BY d.updated_at DESC`);
    return NextResponse.json({ data: result.rows });
  } catch (error) { return apiError(error); }
}
