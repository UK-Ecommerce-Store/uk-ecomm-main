import { NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";

export async function GET(request: Request) {
  try {
    const user = await requireRequestUser(request, ["CUSTOMER"]);
    const result = await db.query(
      `SELECT o.id,o.tracking_code AS "trackingCode",o.status,o.payment_status AS "paymentStatus",
        o.total_paise/100.0 AS total,o.created_at AS "createdAt",
        coalesce((SELECT json_agg(json_build_object('name',oi.product_name,'quantity',oi.quantity,'unit',oi.unit) ORDER BY oi.created_at)
          FROM order_items oi WHERE oi.order_id=o.id),'[]'::json) AS items
       FROM orders o
       WHERE o.customer_user_id=$1 OR (o.customer_user_id IS NULL AND lower(o.customer_email)=lower($2))
       ORDER BY o.created_at DESC LIMIT 100`,
      [user.id, user.email],
    );
    return NextResponse.json({ data: result.rows });
  } catch (error) {
    return apiError(error);
  }
}
