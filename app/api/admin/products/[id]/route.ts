import { NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/auth";
import { withTransaction } from "@/lib/db";
import { apiError, assertSameOrigin, HttpError } from "@/lib/http";
import { productSchema } from "@/lib/validation";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await requireRequestUser(request, ["ADMIN"]);
    const input = productSchema.parse(await request.json());
    const { id } = await params;
    await withTransaction(async (client) => {
      const current = await client.query<{ stock_quantity: number }>("SELECT stock_quantity FROM products WHERE id=$1 FOR UPDATE", [id]);
      if (!current.rowCount) throw new HttpError(404, "Product not found");
      await client.query(
        `UPDATE products SET category_id=$1,sku=$2,slug=$3,name=$4,description=$5,unit=$6,price_paise=$7,mrp_paise=$8,
          stock_quantity=$9,reorder_level=$10,image_url=$11,emoji=$12,accent=$13,status=$14 WHERE id=$15`,
        [input.categoryId,input.sku,input.slug,input.name,input.description,input.unit,Math.round(input.price*100),input.mrp==null?null:Math.round(input.mrp*100),
          input.stock,input.reorderAt,input.imageUrl||null,input.emoji,input.accent,input.status,id],
      );
      const delta = input.stock-current.rows[0].stock_quantity;
      if (delta !== 0) await client.query(
        `INSERT INTO inventory_movements(product_id,quantity_delta,resulting_quantity,reason,reference_type,reference_id,created_by)
         VALUES ($1,$2,$3,'Admin adjustment','PRODUCT',$1,$4)`, [id,delta,input.stock,user.id],
      );
      await client.query(`INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,metadata) VALUES ($1,'UPDATE','PRODUCT',$2,$3)`, [user.id,id,JSON.stringify({ sku: input.sku, stockDelta: delta })]);
    });
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await requireRequestUser(request, ["ADMIN"]);
    const { id } = await params;
    const result = await withTransaction(async (client) => {
      const updated = await client.query("UPDATE products SET status='ARCHIVED' WHERE id=$1 RETURNING id", [id]);
      if (!updated.rowCount) throw new HttpError(404, "Product not found");
      await client.query(`INSERT INTO audit_logs(actor_id,action,entity_type,entity_id) VALUES ($1,'ARCHIVE','PRODUCT',$2)`, [user.id,id]);
      return updated.rows[0];
    });
    return NextResponse.json({ data: result });
  } catch (error) { return apiError(error); }
}
