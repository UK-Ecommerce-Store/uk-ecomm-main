import { NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";

export async function GET(request: Request) {
  try {
    await requireRequestUser(request, ["ADMIN"]);
    const result = await db.query(`SELECT o.id,o.tracking_code AS "trackingCode",o.customer_name AS customer,o.customer_email AS email,o.customer_phone AS phone,
      concat_ws(', ',o.address_line1,o.address_line2,o.city,o.state,o.postal_code) AS address,o.total_paise/100.0 AS total,o.payment_method AS "paymentMethod",
      o.payment_status AS "paymentStatus",o.status,o.created_at AS "createdAt",d.id AS "deliveryId",d.status AS "deliveryStatus",u.id AS "driverId",u.name AS driver,
      coalesce((SELECT json_agg(json_build_object('name',oi.product_name,'sku',oi.sku,'quantity',oi.quantity,'unit',oi.unit,'unitPrice',oi.unit_price_paise/100.0,
        'category',c.name,'categorySlug',c.slug) ORDER BY oi.created_at)
        FROM order_items oi LEFT JOIN products p ON p.id=oi.product_id LEFT JOIN categories c ON c.id=p.category_id WHERE oi.order_id=o.id),'[]'::json) AS items
      FROM orders o LEFT JOIN deliveries d ON d.order_id=o.id LEFT JOIN users u ON u.id=d.driver_id ORDER BY o.created_at DESC LIMIT 250`);
    return NextResponse.json({ data: result.rows });
  } catch (error) { return apiError(error); }
}
