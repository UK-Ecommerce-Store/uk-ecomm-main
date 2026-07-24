import { NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/auth";
import { withTransaction } from "@/lib/db";
import { apiError, assertSameOrigin, HttpError } from "@/lib/http";
import { categorySchema } from "@/lib/validation";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const actor = await requireRequestUser(request, ["ADMIN"]);
    const input = categorySchema.parse(await request.json());
    const { id } = await params;
    await withTransaction(async (client) => {
      const result = await client.query(
        `UPDATE categories SET name=$1,slug=$2,icon=$3,description=$4,sort_order=$5,active=$6 WHERE id=$7 RETURNING id`,
        [input.name,input.slug,input.icon,input.description ?? null,input.sortOrder,input.active,id],
      );
      if (!result.rowCount) throw new HttpError(404, "Category not found");
      await client.query(`INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,metadata) VALUES ($1,'UPDATE','CATEGORY',$2,$3)`, [actor.id,id,JSON.stringify({ name: input.name, active: input.active })]);
    });
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
