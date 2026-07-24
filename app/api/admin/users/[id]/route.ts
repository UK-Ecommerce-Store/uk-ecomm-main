import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRequestUser } from "@/lib/auth";
import { withTransaction } from "@/lib/db";
import { apiError, assertSameOrigin, HttpError } from "@/lib/http";

const schema = z.object({ name: z.string().trim().min(2).max(120), role: z.enum(["ADMIN","DELIVERY","CUSTOMER"]), phone: z.string().trim().max(20).nullable().optional(), active: z.boolean(), password: z.string().min(12).max(72).optional() });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const actor = await requireRequestUser(request, ["ADMIN"]);
    const input = schema.parse(await request.json());
    const { id } = await params;
    if (id === actor.id && !input.active) throw new HttpError(400, "You cannot deactivate your own account");
    if (input.password && bcrypt.truncates(input.password)) throw new HttpError(400, "Password exceeds bcrypt's 72-byte limit");
    const hash = input.password ? await bcrypt.hash(input.password, 12) : null;
    await withTransaction(async (client) => {
      const result = await client.query(`UPDATE users SET name=$1,role=$2,phone=$3,active=$4,password_hash=coalesce($5,password_hash) WHERE id=$6 RETURNING id`, [input.name,input.role,input.phone||null,input.active,hash,id]);
      if (!result.rowCount) throw new HttpError(404, "User not found");
      if (!input.active || hash) await client.query("DELETE FROM sessions WHERE user_id=$1", [id]);
      await client.query(`INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,metadata) VALUES ($1,'UPDATE','USER',$2,$3)`, [actor.id,id,JSON.stringify({ role: input.role, active: input.active })]);
    });
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
