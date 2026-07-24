import { NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/auth";
import { db, withTransaction } from "@/lib/db";
import { apiError, assertSameOrigin } from "@/lib/http";
import { categorySchema } from "@/lib/validation";

export async function GET(request: Request) {
  try {
    await requireRequestUser(request, ["ADMIN"]);
    const result = await db.query(`SELECT id,name,slug,icon,description,sort_order AS "sortOrder",active,created_at AS "createdAt" FROM categories ORDER BY sort_order,name`);
    return NextResponse.json({ data: result.rows });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const actor = await requireRequestUser(request, ["ADMIN"]);
    const input = categorySchema.parse(await request.json());
    const row = await withTransaction(async (client) => {
      const result = await client.query(
        `INSERT INTO categories(name,slug,icon,description,sort_order,active)
         VALUES ($1,$2,$3,$4,$5,$6)
         RETURNING id,name,slug,icon,description,sort_order AS "sortOrder",active`,
        [input.name,input.slug,input.icon,input.description ?? null,input.sortOrder,input.active],
      );
      await client.query(`INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,metadata) VALUES ($1,'CREATE','CATEGORY',$2,$3)`, [actor.id,result.rows[0].id,JSON.stringify({ name: input.name, slug: input.slug })]);
      return result.rows[0];
    });
    return NextResponse.json({ data: row }, { status: 201 });
  } catch (error) { return apiError(error); }
}
