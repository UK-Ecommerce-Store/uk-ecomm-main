import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRequestUser } from "@/lib/auth";
import { withTransaction } from "@/lib/db";
import { apiError, assertSameOrigin, HttpError } from "@/lib/http";

const schema = z.object({
  status: z.enum(["PLACED","CONFIRMED","PACKING","READY","OUT_FOR_DELIVERY","DELIVERED","CANCELLED"]).optional(),
  paymentStatus: z.enum(["PENDING","PAID","FAILED","REFUNDED"]).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await requireRequestUser(request, ["ADMIN"]);
    const input = schema.parse(await request.json());
    const { id } = await params;
    if (!input.status && !input.paymentStatus) throw new HttpError(400, "No changes supplied");

    await withTransaction(async (client) => {
      const order = await client.query<{ status: string; payment_method: string }>(
        "SELECT status,payment_method FROM orders WHERE id=$1 FOR UPDATE", [id],
      );
      if (!order.rowCount) throw new HttpError(404, "Order not found");
      const current = order.rows[0];
      if (current.status === "CANCELLED" && input.status && input.status !== "CANCELLED") {
        throw new HttpError(409, "Cancelled orders cannot be reopened");
      }

      if (input.status === "CANCELLED" && current.status !== "CANCELLED") {
        const items = await client.query<{ product_id: string | null; quantity: number }>(
          "SELECT product_id,quantity FROM order_items WHERE order_id=$1 FOR UPDATE", [id],
        );
        for (const item of items.rows) {
          if (!item.product_id) continue;
          const restored = await client.query<{ stock_quantity: number }>(
            "UPDATE products SET stock_quantity=stock_quantity+$1 WHERE id=$2 RETURNING stock_quantity", [item.quantity,item.product_id],
          );
          if (restored.rowCount) await client.query(
            `INSERT INTO inventory_movements(product_id,quantity_delta,resulting_quantity,reason,reference_type,reference_id,created_by)
             VALUES ($1,$2,$3,'Order cancellation','ORDER',$4,$5)`,
            [item.product_id,item.quantity,restored.rows[0].stock_quantity,id,user.id],
          );
        }
        await client.query("UPDATE deliveries SET status='FAILED' WHERE order_id=$1 AND status<>'DELIVERED'", [id]);
      }

      await client.query(`UPDATE orders SET status=coalesce($1,status),payment_status=coalesce($2,payment_status) WHERE id=$3`,
        [input.status ?? null,input.paymentStatus ?? null,id]);

      if (input.status === "DELIVERED") {
        await client.query("UPDATE deliveries SET status='DELIVERED',delivered_at=coalesce(delivered_at,now()) WHERE order_id=$1", [id]);
        if (current.payment_method === "COD" && !input.paymentStatus) {
          await client.query("UPDATE orders SET payment_status='PAID' WHERE id=$1", [id]);
        }
      }
      await client.query(`INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,metadata)
        VALUES ($1,'UPDATE','ORDER',$2,$3)`, [user.id,id,JSON.stringify(input)]);
    });
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
