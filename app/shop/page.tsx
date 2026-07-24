import { Shopfront } from "@/components/shopfront";
import { currentUser } from "@/lib/auth";
import { listActiveProducts, listCategories } from "@/lib/catalog";

export const dynamic = "force-dynamic";
export default async function ShopPage() {
  const [products, categories, user] = await Promise.all([listActiveProducts(), listCategories(), currentUser()]);
  return <Shopfront products={products} categories={categories} user={user ? { name: user.name, role: user.role } : null} />;
}
