import { NextResponse } from "next/server";
import { requestUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, HttpError } from "@/lib/http";
import type { TrackingSnapshot } from "@/lib/contracts";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ trackingCode: string }> },
) {
  try {
    const [{ trackingCode }, viewer] = await Promise.all([params, requestUser(request)]);
    const result = await db.query<{
      tracking_code: string;
      order_status: string;
      customer_name: string;
      customer_email: string;
      customer_user_id: string | null;
      city: string;
      created_at: Date;
      estimated_arrival: Date | null;
      delivery_id: string | null;
      delivery_status: string | null;
      driver_id: string | null;
      driver_name: string | null;
      driver_phone: string | null;
      store_lat: number | null;
      store_lng: number | null;
      destination_lat: number | null;
      destination_lng: number | null;
      last_lat: number | null;
      last_lng: number | null;
      last_location_at: Date | null;
    }>(
      `SELECT o.tracking_code,o.status AS order_status,o.customer_name,o.customer_email,o.customer_user_id,o.city,o.created_at,d.estimated_arrival,d.id AS delivery_id,
        d.status AS delivery_status,d.driver_id,u.name AS driver_name,u.phone AS driver_phone,d.store_lat,d.store_lng,d.destination_lat,d.destination_lng,
        d.last_lat,d.last_lng,d.last_location_at
       FROM orders o LEFT JOIN deliveries d ON d.order_id=o.id LEFT JOIN users u ON u.id=d.driver_id
       WHERE upper(o.tracking_code)=upper($1) LIMIT 1`,
      [trackingCode],
    );
    const row = result.rows[0];
    if (!row) throw new HttpError(404, "Order not found");
    const ownsOrder = viewer?.role === "CUSTOMER" && (
      row.customer_user_id === viewer.id || (!row.customer_user_id && row.customer_email.toLowerCase() === viewer.email.toLowerCase())
    );
    const points = row.delivery_id
      ? await db.query<{ latitude: number; longitude: number }>(
          `SELECT latitude,longitude FROM delivery_locations WHERE delivery_id=$1 ORDER BY captured_at DESC LIMIT 250`,
          [row.delivery_id],
        )
      : { rows: [] as Array<{ latitude: number; longitude: number }> };
    const snapshot: TrackingSnapshot = {
      order: {
        trackingCode: row.tracking_code,
        status: row.order_status,
        customerName: row.customer_name,
        city: row.city,
        createdAt: row.created_at.toISOString(),
        estimatedArrival: row.estimated_arrival?.toISOString() ?? null,
      },
      delivery: row.delivery_id
        ? {
            id: row.delivery_id,
            status: row.delivery_status!,
            driverName: row.driver_name,
            driverPhone: ownsOrder && row.driver_id ? row.driver_phone : null,
            store: [row.store_lat!, row.store_lng!],
            destination:
              row.destination_lat != null && row.destination_lng != null
                ? [row.destination_lat, row.destination_lng]
                : null,
            current:
              row.last_lat != null && row.last_lng != null
                ? [row.last_lat, row.last_lng]
                : null,
            lastLocationAt: row.last_location_at?.toISOString() ?? null,
          }
        : null,
      path: points.rows.reverse().map((point) => [point.latitude, point.longitude]),
    };
    return NextResponse.json({ data: snapshot });
  } catch (error) {
    return apiError(error);
  }
}
