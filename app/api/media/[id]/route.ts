import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }
  const result = await db.query<{ data: Buffer; mime_type: string; file_name: string }>(
    "SELECT data,mime_type,file_name FROM media_assets WHERE id=$1 LIMIT 1",
    [id],
  );

  if (!result.rowCount) return NextResponse.json({ error: "Image not found" }, { status: 404 });
  const asset = result.rows[0];
  return new NextResponse(new Uint8Array(asset.data), {
    headers: {
      "Content-Type": asset.mime_type,
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(asset.file_name)}`,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
