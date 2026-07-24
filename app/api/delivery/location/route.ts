import { NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/auth";
import { withTransaction } from "@/lib/db";
import { apiError, assertSameOrigin, HttpError } from "@/lib/http";
import { deliveryLocationSchema } from "@/lib/validation";
import { isInsideSurat } from "@/lib/service-area";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireRequestUser(request, ["DELIVERY"]);
    const input = deliveryLocationSchema.parse(await request.json());
    if (!isInsideSurat(input.latitude, input.longitude)) throw new HttpError(400, "Rider location is outside the Surat service area");
    const capturedAt = new Date(input.capturedAt);
    const ageMs = Date.now() - capturedAt.getTime();
    if (ageMs < -120_000 || ageMs > 86_400_000) throw new HttpError(400, "Location timestamp is outside the accepted window");
    await withTransaction(async (client) => {
      const delivery = await client.query("SELECT id FROM deliveries WHERE id=$1 AND driver_id=$2 AND status IN ('ASSIGNED','PICKED_UP','ON_THE_WAY') FOR UPDATE", [input.deliveryId,user.id]);
      if (!delivery.rowCount) throw new HttpError(404, "Active assignment not found");
      await client.query(`INSERT INTO delivery_locations(delivery_id,driver_id,latitude,longitude,accuracy_m,heading,speed_mps,captured_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, [input.deliveryId,user.id,input.latitude,input.longitude,input.accuracy??null,input.heading??null,input.speed??null,capturedAt]);
      await client.query(`UPDATE deliveries SET last_lat=$1,last_lng=$2,last_accuracy_m=$3,last_location_at=$4 WHERE id=$5 AND (last_location_at IS NULL OR last_location_at<=$4)`,
        [input.latitude,input.longitude,input.accuracy??null,capturedAt,input.deliveryId]);
    });
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
