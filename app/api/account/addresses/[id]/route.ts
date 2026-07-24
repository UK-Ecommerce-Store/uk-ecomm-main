import { NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/auth";
import { withTransaction } from "@/lib/db";
import { apiError, assertSameOrigin, HttpError } from "@/lib/http";
import { customerAddressSchema } from "@/lib/validation";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await requireRequestUser(request, ["CUSTOMER"]);
    const input = customerAddressSchema.parse(await request.json());
    const { id } = await params;
    const row = await withTransaction(async (client) => {
      if (input.isDefault) await client.query("UPDATE customer_addresses SET is_default=false WHERE user_id=$1", [user.id]);
      const result = await client.query(`UPDATE customer_addresses SET label=$1,address_line1=$2,address_line2=$3,city=$4,state=$5,postal_code=$6,latitude=$7,longitude=$8,is_default=$9
        WHERE id=$10 AND user_id=$11
        RETURNING id,label,address_line1 AS "addressLine1",address_line2 AS "addressLine2",city,state,postal_code AS "postalCode",latitude,longitude,is_default AS "isDefault"`,
        [input.label,input.addressLine1,input.addressLine2 || null,input.city,input.state,input.postalCode,input.latitude ?? null,input.longitude ?? null,input.isDefault,id,user.id]);
      if (!result.rowCount) throw new HttpError(404, "Address not found");
      return result.rows[0];
    });
    return NextResponse.json({ data: row });
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await requireRequestUser(request, ["CUSTOMER"]);
    const { id } = await params;
    await withTransaction(async (client) => {
      const existing = await client.query<{ is_default: boolean }>("SELECT is_default FROM customer_addresses WHERE id=$1 AND user_id=$2 FOR UPDATE", [id,user.id]);
      if (!existing.rowCount) throw new HttpError(404, "Address not found");
      await client.query("DELETE FROM customer_addresses WHERE id=$1 AND user_id=$2", [id,user.id]);
      if (existing.rows[0].is_default) {
        await client.query(`UPDATE customer_addresses SET is_default=true WHERE id=(SELECT id FROM customer_addresses WHERE user_id=$1 ORDER BY updated_at DESC LIMIT 1)`, [user.id]);
      }
    });
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
