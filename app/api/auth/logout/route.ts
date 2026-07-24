import { NextResponse } from "next/server";
import { clearWebSession, revokeSession } from "@/lib/auth";
import { apiError, assertSameOrigin } from "@/lib/http";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await revokeSession(request);
    await clearWebSession();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
