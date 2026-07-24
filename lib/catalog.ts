import "server-only";
import { db } from "@/lib/db";
import type { Category, Product } from "@/lib/contracts";

const productSelect = `
  SELECT p.id, p.category_id AS "categoryId", c.name AS category, c.slug AS "categorySlug",
         p.sku,p.slug,p.name,p.description,p.unit,
         p.price_paise/100.0 AS price, p.mrp_paise/100.0 AS mrp,
         p.stock_quantity AS stock,p.reorder_level AS "reorderAt",p.image_url AS "imageUrl",
         p.emoji,p.accent,p.status
  FROM products p JOIN categories c ON c.id=p.category_id`;

export async function listActiveProducts() {
  const result = await db.query<Product>(`${productSelect} WHERE p.status='ACTIVE' AND c.active=true ORDER BY c.sort_order,p.created_at DESC`);
  return result.rows;
}

export async function listAllProducts() {
  const result = await db.query<Product>(`${productSelect} ORDER BY p.updated_at DESC`);
  return result.rows;
}

export async function getProductBySlug(slug: string) {
  const result = await db.query<Product>(`${productSelect} WHERE p.slug=$1 AND p.status='ACTIVE' LIMIT 1`, [slug]);
  return result.rows[0] ?? null;
}

export async function listCategories() {
  const result = await db.query<Category>(`SELECT id,name,slug,icon,description FROM categories WHERE active=true ORDER BY sort_order,name`);
  return result.rows;
}
