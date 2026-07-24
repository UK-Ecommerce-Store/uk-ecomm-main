import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRequestUser } from "@/lib/auth";
import { withTransaction } from "@/lib/db";
import { apiError, assertSameOrigin, HttpError } from "@/lib/http";

const schema = z.object({
  status: z.enum(["PICKED_UP", "ON_THE_WAY", "DELIVERED", "FAILED"]),
  cashCollected: z.boolean().optional(),
  collectedAmount: z.coerce.number().min(0).max(10_000_000).optional(),
});
const allowed: Record<string, string[]> = {
  ASSIGNED: ["PICKED_UP", "FAILED"],
  PICKED_UP: ["ON_THE_WAY", "FAILED"],
  ON_THE_WAY: ["DELIVERED", "FAILED"],
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    const user = await requireRequestUser(request, ["DELIVERY"]);
    const input = schema.parse(await request.json());
    const { id } = await params;
    await withTransaction(async (client) => {
      const delivery = await client.query<{
        order_id: string;
        status: string;
        payment_method: string;
        payment_status: string;
        total_paise: number;
      }>(
        `SELECT d.order_id,d.status,o.payment_method,o.payment_status,o.total_paise
         FROM deliveries d JOIN orders o ON o.id=d.order_id
         WHERE d.id=$1 AND d.driver_id=$2 FOR UPDATE OF d,o`,
        [id, user.id],
      );
      if (!delivery.rowCount) throw new HttpError(404, "Assignment not found");
      const current = delivery.rows[0];
      if (!(allowed[current.status] ?? []).includes(input.status)) {
        throw new HttpError(409, `Cannot change ${current.status} to ${input.status}`);
      }

      if (input.status === "DELIVERED" && current.payment_method === "COD" && current.payment_status !== "PAID") {
        if (!input.cashCollected) {
          throw new HttpError(409, "Confirm the COD cash collection before completing this delivery");
        }
        const expected = Number(current.total_paise) / 100;
        const collected = Number(input.collectedAmount ?? NaN);
        if (!Number.isFinite(collected) || Math.abs(collected - expected) > 0.009) {
          throw new HttpError(400, `Collected amount must be ₹${expected.toFixed(2)}`);
        }
        await client.query(
          `UPDATE orders SET payment_status='PAID',cod_collected_at=now(),cod_collected_by=$1 WHERE id=$2`,
          [user.id, current.order_id],
        );
      }

      await client.query(
        `UPDATE deliveries
         SET status=$1::delivery_status,
           picked_up_at=CASE WHEN $1::delivery_status='PICKED_UP'::delivery_status THEN COALESCE(picked_up_at,now()) ELSE picked_up_at END,
           delivered_at=CASE WHEN $1::delivery_status='DELIVERED'::delivery_status THEN COALESCE(delivered_at,now()) ELSE delivered_at END
         WHERE id=$2::uuid`,
        [input.status, id],
      );
      const orderStatus = input.status === "DELIVERED"
        ? "DELIVERED"
        : input.status === "FAILED"
          ? "CONFIRMED"
          : input.status === "PICKED_UP"
            ? "READY"
            : "OUT_FOR_DELIVERY";
      await client.query(`UPDATE orders SET status=$1::order_status WHERE id=$2`, [orderStatus, current.order_id]);
      await client.query(
        `INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,metadata) VALUES ($1,'STATUS','DELIVERY',$2,$3)`,
        [user.id, id, JSON.stringify({ status: input.status, cashCollected: Boolean(input.cashCollected) })],
      );
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
