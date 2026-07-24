import { NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/auth";
import { db, withTransaction } from "@/lib/db";
import { apiError, assertSameOrigin, HttpError } from "@/lib/http";
import { inventoryAdjustmentSchema } from "@/lib/validation";

export async function GET(request: Request) {
  try {
    await requireRequestUser(request, ["ADMIN"]);
    const [movements, stockSummary] = await Promise.all([
      db.query(`SELECT m.id,m.product_id AS "productId",p.name AS product,p.sku,m.quantity_delta AS "quantityDelta",
        m.resulting_quantity AS "resultingQuantity",m.reason,m.reference_type AS "referenceType",m.reference_id AS "referenceId",
        u.name AS actor,m.created_at AS "createdAt"
        FROM inventory_movements m JOIN products p ON p.id=m.product_id LEFT JOIN users u ON u.id=m.created_by
        ORDER BY m.created_at DESC LIMIT 300`),
      db.query(`SELECT coalesce(sum(stock_quantity),0)::int AS "unitsInStock",
        count(*) FILTER (WHERE status='ACTIVE' AND stock_quantity<=reorder_level)::int AS "lowStockProducts",
        coalesce(sum(stock_quantity*price_paise),0)::bigint/100.0 AS "stockValue"
        FROM products WHERE status<>'ARCHIVED'`),
    ]);
    return NextResponse.json({ data: movements.rows, summary: stockSummary.rows[0] });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const actor = await requireRequestUser(request, ["ADMIN"]);
    const input = inventoryAdjustmentSchema.parse(await request.json());
    const result = await withTransaction(async (client) => {
      const product = await client.query<{ stock_quantity: number; name: string }>(
        "SELECT stock_quantity,name FROM products WHERE id=$1 FOR UPDATE", [input.productId],
      );
      if (!product.rowCount) throw new HttpError(404, "Product not found");
      const resulting = product.rows[0].stock_quantity + input.quantityDelta;
      if (resulting < 0) throw new HttpError(409, `${product.rows[0].name} has only ${product.rows[0].stock_quantity} units`);
      await client.query("UPDATE products SET stock_quantity=$1 WHERE id=$2", [resulting,input.productId]);
      const movement = await client.query(
        `INSERT INTO inventory_movements(product_id,quantity_delta,resulting_quantity,reason,reference_type,reference_id,created_by)
         VALUES ($1,$2,$3,$4,'MANUAL',$1,$5) RETURNING id`,
        [input.productId,input.quantityDelta,resulting,input.reason,actor.id],
      );
      await client.query(`INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,metadata)
        VALUES ($1,'ADJUST','INVENTORY',$2,$3)`, [actor.id,String(movement.rows[0].id),JSON.stringify(input)]);
      return { id: movement.rows[0].id, resultingQuantity: resulting };
    });
    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) { return apiError(error); }
}
