import { NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";

export async function GET(request: Request) {
  try {
    await requireRequestUser(request, ["ADMIN"]);
    const result = await db.query(`SELECT a.id,a.action,a.entity_type AS "entityType",a.entity_id AS "entityId",a.metadata,
      a.ip_address AS "ipAddress",a.created_at AS "createdAt",u.name AS actor,u.email AS "actorEmail"
      FROM audit_logs a LEFT JOIN users u ON u.id=a.actor_id ORDER BY a.created_at DESC LIMIT 300`);
    return NextResponse.json({ data: result.rows });
  } catch (error) { return apiError(error); }
}
