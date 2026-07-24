import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, assertSameOrigin, HttpError } from "@/lib/http";
import { productImageBucket, supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const extensionByMime: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" };

function detectedMime(bytes: Buffer): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  if (bytes.length >= 12 && bytes.toString("ascii", 4, 8) === "ftyp" && ["avif", "avis"].includes(bytes.toString("ascii", 8, 12))) return "image/avif";
  return null;
}

async function ensureBucket() {
  const supabase = supabaseAdmin();
  const bucket = productImageBucket();
  const { data, error } = await supabase.storage.getBucket(bucket);
  if (error && !/not found/i.test(error.message)) throw new HttpError(500, `Could not read Supabase image bucket: ${error.message}`);
  if (!data) {
    const created = await supabase.storage.createBucket(bucket, { public: true, fileSizeLimit: MAX_IMAGE_BYTES, allowedMimeTypes: [...ALLOWED_TYPES] });
    if (created.error) throw new HttpError(500, `Could not create Supabase image bucket: ${created.error.message}`);
  } else if (!data.public) {
    const updated = await supabase.storage.updateBucket(bucket, { public: true, fileSizeLimit: MAX_IMAGE_BYTES, allowedMimeTypes: [...ALLOWED_TYPES] });
    if (updated.error) throw new HttpError(500, `Could not make Supabase image bucket public: ${updated.error.message}`);
  }
  return { supabase, bucket };
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireRequestUser(request, ["ADMIN"]);
    const body = await request.formData();
    const file = body.get("file");

    if (!(file instanceof File)) throw new HttpError(400, "Choose an image to upload");
    if (!ALLOWED_TYPES.has(file.type)) throw new HttpError(415, "Use JPG, PNG, WebP or AVIF images");
    if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) throw new HttpError(413, "Image must be smaller than 5 MB");

    const bytes = Buffer.from(await file.arrayBuffer());
    const actualMime = detectedMime(bytes);
    if (!actualMime || actualMime !== file.type) throw new HttpError(415, "The file contents do not match the selected image type");

    const { supabase, bucket } = await ensureBucket();
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const path = `products/${new Date().getUTCFullYear()}/${randomUUID()}-${sha256.slice(0,12)}.${extensionByMime[actualMime]}`;
    const uploaded = await supabase.storage.from(bucket).upload(path, bytes, { contentType: actualMime, cacheControl: "31536000", upsert: false });
    if (uploaded.error) throw new HttpError(500, `Supabase image upload failed: ${uploaded.error.message}`);
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    if (!data.publicUrl) throw new HttpError(500, "Supabase did not return a public image URL");

    await db.query(`INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,metadata)
      VALUES ($1,'UPLOAD','MEDIA',$2,$3)`, [user.id,path,JSON.stringify({ fileName: file.name, mimeType: actualMime, size: file.size, sha256, provider: "supabase-storage", bucket })]);
    return NextResponse.json({ data: { id: path, path, url: data.publicUrl } }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
