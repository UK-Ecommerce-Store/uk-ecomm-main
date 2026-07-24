import { NextResponse } from "next/server";
import { listActiveProducts, listCategories } from "@/lib/catalog";
import { apiError } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [products, categories] = await Promise.all([listActiveProducts(), listCategories()]);
    return NextResponse.json({ data: products, categories, meta: { count: products.length, version: "v2" } });
  } catch (error) {
    return apiError(error);
  }
}
