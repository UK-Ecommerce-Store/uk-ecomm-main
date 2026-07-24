import { NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, assertSameOrigin, HttpError } from "@/lib/http";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await requireRequestUser(request);
    const { id } = await params;
    const result = await db.query("DELETE FROM passkeys WHERE id=$1 AND user_id=$2", [id,user.id]);
    if (!result.rowCount) throw new HttpError(404, "Passkey not found");
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
