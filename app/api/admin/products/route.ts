import { NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/auth";
import { listAllProducts, listCategories } from "@/lib/catalog";
import { withTransaction } from "@/lib/db";
import { apiError, assertSameOrigin } from "@/lib/http";
import { productSchema } from "@/lib/validation";

export async function GET(request: Request) {
  try {
    await requireRequestUser(request, ["ADMIN"]);
    const [products, categories] = await Promise.all([listAllProducts(), listCategories()]);
    return NextResponse.json({ data: products, categories });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireRequestUser(request, ["ADMIN"]);
    const input = productSchema.parse(await request.json());
    const product = await withTransaction(async (client) => {
      const result = await client.query(
        `INSERT INTO products(category_id,sku,slug,name,description,unit,price_paise,mrp_paise,stock_quantity,reorder_level,image_url,emoji,accent,status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id`,
        [input.categoryId,input.sku,input.slug,input.name,input.description,input.unit,Math.round(input.price*100),input.mrp==null?null:Math.round(input.mrp*100),
          input.stock,input.reorderAt,input.imageUrl||null,input.emoji,input.accent,input.status],
      );
      if (input.stock > 0) await client.query(
        `INSERT INTO inventory_movements(product_id,quantity_delta,resulting_quantity,reason,reference_type,created_by)
         VALUES ($1,$2,$2,'Initial stock','PRODUCT',$3)`, [result.rows[0].id,input.stock,user.id],
      );
      await client.query(`INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,metadata) VALUES ($1,'CREATE','PRODUCT',$2,$3)`, [user.id,result.rows[0].id,JSON.stringify({ sku: input.sku })]);
      return result.rows[0];
    });
    return NextResponse.json({ data: product }, { status: 201 });
  } catch (error) { return apiError(error); }
}
