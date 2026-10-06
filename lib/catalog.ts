import "server-only";
import { supabase } from "@/lib/supabase";
import type { Category, Product } from "@/lib/contracts";

// Common select string with foreign key relation for categories
const productSelectFields = `
  id,
  category_id,
  sku,
  slug,
  name,
  description,
  unit,
  price_paise,
  mrp_paise,
  stock_quantity,
  reorder_level,
  image_url,
  emoji,
  accent,
  status,
  created_at,
  updated_at,
  categories (
    name,
    slug,
    active,
    sort_order
  )
`;

// Helper to map raw Supabase response to your Product contract
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapProduct(p: any): Product {
  return {
    id: p.id,
    categoryId: p.category_id,
    category: p.categories?.name ?? "",
    categorySlug: p.categories?.slug ?? "",
    sku: p.sku,
    slug: p.slug,
    name: p.name,
    description: p.description,
    unit: p.unit,
    price: p.price_paise ? p.price_paise / 100.0 : 0,
    mrp: p.mrp_paise ? p.mrp_paise / 100.0 : 0,
    stock: p.stock_quantity,
    reorderAt: p.reorder_level,
    imageUrl: p.image_url,
    emoji: p.emoji,
    accent: p.accent,
    status: p.status,
  };
}

export async function listActiveProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select(productSelectFields)
    .eq("status", "ACTIVE")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  // Filter out products where the joined category is not active (c.active = true)
  const filtered = (data || []).filter((p: any) => p.categories?.active === true);

  // Sort by category sort_order, then product created_at descending
  filtered.sort((a: any, b: any) => {
    const orderA = a.categories?.sort_order ?? 0;
    const orderB = b.categories?.sort_order ?? 0;
    if (orderA !== orderB) return orderA - orderB;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return filtered.map(mapProduct);
}

export async function listAllProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select(productSelectFields)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map(mapProduct);
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from("products")
    .select(productSelectFields)
    .eq("slug", slug)
    .eq("status", "ACTIVE")
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) return null;
  return mapProduct(data);
}

export async function listCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, icon, description")
    .eq("active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}