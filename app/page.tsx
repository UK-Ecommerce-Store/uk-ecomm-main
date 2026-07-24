import Storefront from "@/components/storefront";
import { currentUser } from "@/lib/auth";
import { listCategories } from "@/lib/catalog";

export const dynamic = "force-dynamic";
export default async function HomePage() {
  const [user, categories] = await Promise.all([currentUser(), listCategories()]);
  return <Storefront categories={categories} user={user ? { name: user.name, role: user.role } : null} />;
}
