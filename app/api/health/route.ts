import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.query("SELECT 1");
    return NextResponse.json({ status: "ok", database: "connected", timestamp: new Date().toISOString() });
  } catch {
    return NextResponse.json({ status: "degraded", database: "unavailable", timestamp: new Date().toISOString() }, { status: 503 });
  }
}
