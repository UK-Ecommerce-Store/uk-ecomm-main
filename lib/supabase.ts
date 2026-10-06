import "server-only";
import { createClient } from "@supabase/supabase-js";

export function supabaseAdmin() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) {
    throw new Error("Supabase Storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }
  return createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function productImageBucket() {
  return process.env.SUPABASE_STORAGE_BUCKET || "product-images";
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
export const supabase = createClient(supabaseUrl, supabaseKey);