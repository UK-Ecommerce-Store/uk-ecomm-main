import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/auth";
import { db, withTransaction } from "@/lib/db";
import { apiError, assertSameOrigin, HttpError } from "@/lib/http";
import { staffSchema } from "@/lib/validation";

export async function GET(request: Request) {
  try {
    await requireRequestUser(request, ["ADMIN"]);
    const result = await db.query(`SELECT u.id,u.name,u.email,u.role,u.phone,u.active,u.created_at AS "createdAt",
      CASE WHEN u.role='CUSTOMER' THEN (SELECT count(*)::int FROM orders o WHERE o.customer_user_id=u.id OR (o.customer_user_id IS NULL AND lower(o.customer_email)=lower(u.email))) ELSE 0 END AS orders,
      CASE WHEN u.role='CUSTOMER' THEN (SELECT coalesce(sum(o.total_paise),0)::bigint FROM orders o WHERE o.status<>'CANCELLED' AND (o.customer_user_id=u.id OR (o.customer_user_id IS NULL AND lower(o.customer_email)=lower(u.email)))) ELSE 0 END AS spend
      FROM users u ORDER BY u.role,u.name`);
    return NextResponse.json({ data: result.rows });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const actor = await requireRequestUser(request, ["ADMIN"]);
    const input = staffSchema.parse(await request.json());
    if (bcrypt.truncates(input.password)) throw new HttpError(400, "Password exceeds bcrypt's 72-byte limit");
    const hash = await bcrypt.hash(input.password, 12);
    const user = await withTransaction(async (client) => {
      const result = await client.query(`INSERT INTO users(name,email,password_hash,role,phone,active) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id,name,email,role,phone,active`,
        [input.name,input.email,hash,input.role,input.phone||null,input.active]);
      await client.query(`INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,metadata) VALUES ($1,'CREATE','USER',$2,$3)`, [actor.id,result.rows[0].id,JSON.stringify({ role: input.role })]);
      return result.rows[0];
    });
    return NextResponse.json({ data: user }, { status: 201 });
  } catch (error) { return apiError(error); }
}
