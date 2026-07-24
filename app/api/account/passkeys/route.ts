import { NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";

export async function GET(request: Request) {
  try {
    const user = await requireRequestUser(request);
    const result = await db.query(`SELECT id,name,device_type AS "deviceType",backed_up AS "backedUp",created_at AS "createdAt",last_used_at AS "lastUsedAt" FROM passkeys WHERE user_id=$1 ORDER BY created_at DESC`, [user.id]);
    return NextResponse.json({ data: result.rows });
  } catch (error) { return apiError(error); }
}
