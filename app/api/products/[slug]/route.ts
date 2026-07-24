import { NextResponse } from "next/server";
import { getProductBySlug } from "@/lib/catalog";
import { apiError, HttpError } from "@/lib/http";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const product = await getProductBySlug(slug);
    if (!product) throw new HttpError(404, "Product not found");
    return NextResponse.json({ data: product });
  } catch (error) {
    return apiError(error);
  }
}
