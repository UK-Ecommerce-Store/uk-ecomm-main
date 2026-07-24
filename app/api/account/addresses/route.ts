import { NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/auth";
import { db, withTransaction } from "@/lib/db";
import { apiError, assertSameOrigin } from "@/lib/http";
import { customerAddressSchema } from "@/lib/validation";

export async function GET(request: Request) {
  try {
    const user = await requireRequestUser(request, ["CUSTOMER"]);
    const result = await db.query(`SELECT id,label,address_line1 AS "addressLine1",address_line2 AS "addressLine2",city,state,postal_code AS "postalCode",
      latitude,longitude,is_default AS "isDefault",created_at AS "createdAt",updated_at AS "updatedAt"
      FROM customer_addresses WHERE user_id=$1 ORDER BY is_default DESC,updated_at DESC`, [user.id]);
    return NextResponse.json({ data: result.rows });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireRequestUser(request, ["CUSTOMER"]);
    const input = customerAddressSchema.parse(await request.json());
    const row = await withTransaction(async (client) => {
      if (input.isDefault) await client.query("UPDATE customer_addresses SET is_default=false WHERE user_id=$1", [user.id]);
      const result = await client.query(`INSERT INTO customer_addresses(user_id,label,address_line1,address_line2,city,state,postal_code,latitude,longitude,is_default)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        RETURNING id,label,address_line1 AS "addressLine1",address_line2 AS "addressLine2",city,state,postal_code AS "postalCode",latitude,longitude,is_default AS "isDefault"`,
        [user.id,input.label,input.addressLine1,input.addressLine2 || null,input.city,input.state,input.postalCode,input.latitude ?? null,input.longitude ?? null,input.isDefault]);
      const created = result.rows[0];
      const count = await client.query<{ count: number }>("SELECT count(*)::int AS count FROM customer_addresses WHERE user_id=$1", [user.id]);
      if (count.rows[0].count === 1 && !created.isDefault) {
        await client.query("UPDATE customer_addresses SET is_default=true WHERE id=$1", [created.id]);
        created.isDefault = true;
      }
      return created;
    });
    return NextResponse.json({ data: row }, { status: 201 });
  } catch (error) { return apiError(error); }
}
