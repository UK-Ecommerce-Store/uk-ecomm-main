"use client";

import {
  Boxes,
  History,
  LayoutDashboard,
  LoaderCircle,
  MapPinned,
  PackagePlus,
  Plus,
  RefreshCw,
  ScrollText,
  ShoppingCart,
  Trash2,
  Truck,
  Upload,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import AdminOverview from "@/components/admin/admin-overview";
import { MapClient } from "@/components/maps/map-client";
import type { MapPoint } from "@/components/maps/osm-map";
import { ProductMedia } from "@/components/product-media";
import type { Category, Product } from "@/lib/contracts";
import { SURAT_SERVICE_AREA } from "@/lib/service-area";

type Tab =
  | "overview"
  | "products"
  | "inventory"
  | "orders"
  | "users"
  | "riders"
  | "staff"
  | "audit";
type Dashboard = {
  revenue: number;
  revenueChange: number;

  orders: number;
  orderChange: number;

  customers: number;
  customerChange: number;

  activeDeliveries: number;
  deliveredToday: number;

  lowStock: number;

  revenueChart: Array<{
    label: string;
    revenue: number;
    orders: number;
  }>;

  orderStatuses: Array<{
    name: string;
    value: number;
  }>;

  recentOrders: Array<{
    id: string;
    trackingCode: string;
    customerName: string;
    total: number;
    status: string;
    createdAt: string;
  }>;

  topProducts: Array<{
    name: string;
    quantity: number;
    revenue: number;
  }>;

  inventory: {
    totalProducts: number;
    healthy: number;
    lowStock: number;
    outOfStock: number;
  };
};
type Order = {
  id: string;
  trackingCode: string;
  customer: string;
  email: string;
  phone: string;
  address: string;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  createdAt: string;
  deliveryId: string;
  deliveryStatus: string;
  driverId: string | null;
  driver: string | null;
  items: Array<{
    name: string;
    sku: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    category: string | null;
    categorySlug: string | null;
  }>;
};
type Staff = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "DELIVERY";
  phone: string | null;
  active: boolean;
  createdAt: string;
};
type Customer = {
  id: string;
  name: string;
  email: string;
  role: "CUSTOMER";
  phone: string | null;
  active: boolean;
  createdAt: string;
  orders?: number;
  spend?: number;
};
type Delivery = {
  id: string;
  orderId: string;
  trackingCode: string;
  customer: string;
  address: string;
  status: string;
  driverId: string | null;
  driver: string | null;
  lastLat: number | null;
  lastLng: number | null;
  lastLocationAt: string | null;
  estimatedArrival: string | null;
};
type Unassigned = {
  id: string;
  trackingCode: string;
  customer: string;
  city: string;
};
type Fleet = {
  id: string;
  trackingCode: string;
  status: string;
  driverId: string | null;
  driver: string | null;
  phone: string | null;
  storeLat: number;
  storeLng: number;
  destinationLat: number | null;
  destinationLng: number | null;
  lastLat: number | null;
  lastLng: number | null;
  lastLocationAt: string | null;
  estimatedArrival: string | null;
};
type InventoryMovement = {
  id: number;
  productId: string;
  product: string;
  sku: string;
  quantityDelta: number;
  resultingQuantity: number;
  reason: string;
  referenceType: string | null;
  referenceId: string | null;
  actor: string | null;
  createdAt: string;
};
type InventorySummary = {
  unitsInStock: number;
  lowStockProducts: number;
  stockValue: number;
};
type AuditEntry = {
  id: number;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  createdAt: string;
  actor: string | null;
  actorEmail: string | null;
};

const tabs: Array<[Tab, string, LucideIcon]> = [
  ["overview", "Overview", LayoutDashboard],
  ["products", "Products", Boxes],
  ["inventory", "Inventory", History],
  ["orders", "Orders", ShoppingCart],
  ["users", "Users", Users],
  ["riders", "Riders", MapPinned],
  ["staff", "Staff", Users],
  ["audit", "Audit", ScrollText],
];
const moneyFromPaise = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0) / 100);
const moneyFromRupees = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value || 0));
const dateTime = (value: string | null) =>
  value ? new Date(value).toLocaleString("en-IN") : "—";

async function jsonRequest(url: string, options?: RequestInit) {
  const response = await fetch(url, { cache: "no-store", ...options });
  const payload = await response
    .json()
    .catch(() => ({ error: "Invalid server response" }));
  if (!response.ok) throw new Error(payload.error ?? "Request failed");
  return payload;
}

export function AdminDashboard() {
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState("");
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [drivers, setDrivers] = useState<Staff[]>([]);
  const [unassigned, setUnassigned] = useState<Unassigned[]>([]);
  const [fleet, setFleet] = useState<Fleet[]>([]);
  const [inventory, setInventory] = useState<InventoryMovement[]>([]);
  const [inventorySummary, setInventorySummary] = useState<InventorySummary>({
    unitsInStock: 0,
    lowStockProducts: 0,
    stockValue: 0,
  });
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [editing, setEditing] = useState<Product | null>(null);
  const [productModal, setProductModal] = useState(false);
  const [staffModal, setStaffModal] = useState(false);
  const [categoryModal, setCategoryModal] = useState(false);
  const [productCategory, setProductCategory] = useState("all");
  const [orderStatus, setOrderStatus] = useState("all");
  const [selectedRider, setSelectedRider] = useState<string>("all");

  const loadFleet = useCallback(async () => {
    try {
      const payload = await jsonRequest("/api/admin/fleet");
      setFleet(payload.data ?? []);
    } catch {
      /* full refresh reports errors */
    }
  }, []);

  const load = useCallback(async (manual = false) => {
    manual ? setRefreshing(true) : setLoading(true);
    setNotice("");
    try {
      const [d, p, o, u, de, f, i, a] = await Promise.all([
        jsonRequest("/api/admin/dashboard"),
        jsonRequest("/api/admin/products"),
        jsonRequest("/api/admin/orders"),
        jsonRequest("/api/admin/users"),
        jsonRequest("/api/admin/deliveries"),
        jsonRequest("/api/admin/fleet"),
        jsonRequest("/api/admin/inventory"),
        jsonRequest("/api/admin/audit"),
      ]);
      setDashboard(d.data);
      setProducts(p.data ?? []);
      setCategories(p.categories ?? []);
      setOrders(o.data ?? []);
      const allUsers = (u.data ?? []) as Array<Staff | Customer>;
      setStaff(allUsers.filter((entry): entry is Staff => entry.role !== "CUSTOMER"));
      setCustomers(allUsers.filter((entry): entry is Customer => entry.role === "CUSTOMER"));
      setDeliveries(de.data ?? []);
      setDrivers(de.drivers ?? []);
      setUnassigned(de.unassignedOrders ?? []);
      setFleet(f.data ?? []);
      setInventory(i.data ?? []);
      setInventorySummary(
        i.summary ?? { unitsInStock: 0, lowStockProducts: 0, stockValue: 0 },
      );
      setAudit(a.data ?? []);
      if (manual)
        setNotice(
          `Data refreshed at ${new Date().toLocaleTimeString("en-IN")}.`,
        );
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "Authentication required"
      ) {
        window.location.href = "/login?next=/admin";
        return;
      }
      setNotice(
        error instanceof Error
          ? error.message
          : "Could not load administration data.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    const timer = window.setInterval(() => void loadFleet(), 10000);
    return () => window.clearInterval(timer);
  }, [loadFleet]);

  async function saveProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setNotice("");
    try {
      let imageUrl = String(form.get("existingImageUrl") ?? "");
      const image = form.get("image");
      if (image instanceof File && image.size > 0) {
        const uploadBody = new FormData();
        uploadBody.set("file", image);
        const uploaded = await jsonRequest("/api/admin/uploads", {
          method: "POST",
          body: uploadBody,
        });
        imageUrl = uploaded.data.url;
      }
      const payload = {
        categoryId: form.get("categoryId"),
        sku: form.get("sku"),
        slug: form.get("slug"),
        name: form.get("name"),
        description: form.get("description"),
        unit: form.get("unit"),
        price: form.get("price"),
        mrp: form.get("mrp") || null,
        stock: form.get("stock"),
        reorderAt: form.get("reorderAt"),
        imageUrl: imageUrl || null,
        emoji: "",
        accent: "#f0efe9",
        status: form.get("status"),
      };
      await jsonRequest(
        editing ? `/api/admin/products/${editing.id}` : "/api/admin/products",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      setProductModal(false);
      setEditing(null);
      setNotice("Product and inventory details saved.");
      await load();
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Could not save product",
      );
    }
  }

  async function archiveProduct(id: string) {
    if (
      !window.confirm(
        "Archive this product? It will disappear from the storefront.",
      )
    )
      return;
    try {
      await jsonRequest(`/api/admin/products/${id}`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: "{}",
      });
      setNotice("Product archived.");
      await load();
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Could not archive product",
      );
    }
  }

  async function adjustInventory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await jsonRequest("/api/admin/inventory", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          productId: form.get("productId"),
          quantityDelta: form.get("quantityDelta"),
          reason: form.get("reason"),
        }),
      });
      formElement.reset();
      setNotice("Inventory updated and recorded in the ledger.");
      await load();
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Could not update inventory",
      );
    }
  }

  async function updateOrder(
    order: Order,
    changes: { status?: string; paymentStatus?: string },
  ) {
    try {
      await jsonRequest(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(changes),
      });
      setNotice("Order updated.");
      await load();
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Could not update order",
      );
    }
  }

  async function assignDelivery(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await jsonRequest("/api/admin/deliveries", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          orderId: form.get("orderId"),
          driverId: form.get("driverId"),
          etaMinutes: form.get("etaMinutes"),
        }),
      });
      formElement.reset();
      setNotice("Rider assigned successfully.");
      await load();
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Could not assign rider",
      );
    }
  }

  async function updateDelivery(delivery: Delivery, status: string) {
    try {
      await jsonRequest(`/api/admin/deliveries/${delivery.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setNotice("Delivery status updated.");
      await load();
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Could not update delivery",
      );
    }
  }

  async function createCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await jsonRequest("/api/admin/categories", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          slug: form.get("slug"),
          icon: form.get("icon") || "📦",
          description: form.get("description") || null,
          sortOrder: form.get("sortOrder") || 0,
          active: true,
        }),
      });
      formElement.reset();
      setCategoryModal(false);
      setNotice("Category created.");
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not create category");
    }
  }

  async function createStaff(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await jsonRequest("/api/admin/users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          phone: form.get("phone") || null,
          password: form.get("password"),
          role: form.get("role"),
          active: true,
        }),
      });
      setStaffModal(false);
      setNotice("Staff account created.");
      await load();
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Could not create account",
      );
    }
  }

  async function toggleStaff(user: Staff) {
    try {
      await jsonRequest(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: user.name,
          role: user.role,
          phone: user.phone,
          active: !user.active,
        }),
      });
      setNotice("Staff account updated.");
      await load();
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Could not update account",
      );
    }
  }

  async function toggleCustomer(user: Customer) {
    try {
      await jsonRequest(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: user.name, role: "CUSTOMER", phone: user.phone, active: !user.active }),
      });
      setNotice("Customer account updated.");
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not update customer");
    }
  }

  const filteredProducts = productCategory === "all"
    ? products
    : products.filter((product) => product.categorySlug === productCategory);
  const orderStatuses = ["PLACED", "CONFIRMED", "PACKING", "READY", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"] as const;
  const filteredOrders = orderStatus === "all" ? orders : orders.filter((order) => order.status === orderStatus);

  const visibleFleet =
    selectedRider === "all"
      ? fleet
      : fleet.filter((item) => item.driverId === selectedRider);
  const fleetPoints = useMemo<MapPoint[]>(() => {
    const points: MapPoint[] = [
      {
        id: "store",
        position: [
          Number(
            process.env.NEXT_PUBLIC_STORE_LAT ?? SURAT_SERVICE_AREA.center[0],
          ),
          Number(
            process.env.NEXT_PUBLIC_STORE_LNG ?? SURAT_SERVICE_AREA.center[1],
          ),
        ],
        label: process.env.NEXT_PUBLIC_STORE_NAME ?? "UK Store, Surat",
        kind: "store",
      },
    ];
    visibleFleet.forEach((item) => {
      if (item.lastLat != null && item.lastLng != null)
        points.push({
          id: `driver-${item.id}`,
          position: [item.lastLat, item.lastLng],
          label: item.driver ?? "Rider",
          detail: `${item.trackingCode} · ${item.status}`,
          kind: "driver",
        });
      if (item.destinationLat != null && item.destinationLng != null)
        points.push({
          id: `destination-${item.id}`,
          position: [item.destinationLat, item.destinationLng],
          label: `Destination ${item.trackingCode}`,
          kind: "customer",
        });
    });
    return points;
  }, [visibleFleet]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-1">
          {tabs.map(([id, label, Icon]) => (
            <button
              type="button"
              key={id}
              onClick={() => setTab(id)}
              className={`inline-flex whitespace-nowrap items-center gap-2 rounded-full px-4 py-2.5 text-xs font-semibold ${tab === id ? "bg-[#191a17] text-white" : "border border-black/7 bg-white text-[#66655f]"}`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => void load(true)}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-black/8 bg-white px-4 py-2.5 text-xs font-semibold disabled:opacity-50"
        >
          <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
          {refreshing ? "Refreshing…" : "Refresh data"}
        </button>
      </div>

      {notice ? (
        <div className="rounded-2xl border border-black/6 bg-white px-4 py-3 text-sm font-medium text-[#62615b]">
          {notice}
        </div>
      ) : null}
      {loading ? (
        <div className="grid min-h-[420px] place-items-center">
          <LoaderCircle className="animate-spin" />
        </div>
      ) : null}

      {!loading && tab === "overview" && dashboard ? (
        <AdminOverview stats={dashboard} />
      ) : null}

      {!loading && tab === "products" ? (
        <section className="panel p-4 md:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.14em] text-[#99978f]">
                Catalog
              </p>
              <h2 className="mt-2 text-2xl font-semibold">Products</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setCategoryModal(true)}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-black/8 bg-white px-5 py-3 text-xs font-semibold"
              >
                <Plus size={16} /> New category
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setProductModal(true);
                }}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#191a17] px-5 py-3 text-xs font-semibold text-white"
              >
                <Plus size={16} /> Add product
              </button>
            </div>
          </div>
          <div className="hide-scrollbar mt-5 flex gap-2 overflow-x-auto pb-1">
            <button type="button" onClick={() => setProductCategory("all")} className={`whitespace-nowrap rounded-full px-4 py-2.5 text-xs font-semibold ${productCategory === "all" ? "bg-[#191a17] text-white" : "border border-black/7 bg-white"}`}>All products</button>
            {categories.map((category) => <button type="button" key={category.id} onClick={() => setProductCategory(category.slug)} className={`whitespace-nowrap rounded-full px-4 py-2.5 text-xs font-semibold ${productCategory === category.slug ? "bg-[#191a17] text-white" : "border border-black/7 bg-white"}`}>{category.icon ? `${category.icon} ` : ""}{category.name}</button>)}
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filteredProducts.map((product) => (
              <article
                key={product.id}
                className="rounded-[20px] border border-black/6 bg-[#fbfaf7] p-3"
              >
                <div className="flex gap-3">
                  <ProductMedia
                    imageUrl={product.imageUrl}
                    name={product.name}
                    className="size-24 shrink-0 rounded-2xl"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#99978f]">
                          {product.category}
                        </p>
                        <h3 className="mt-1 line-clamp-2 text-sm font-semibold">
                          {product.name}
                        </h3>
                      </div>
                      <span className="status-pill">{product.status}</span>
                    </div>
                    <p className="mt-2 text-xs text-[#77766f]">
                      {product.sku} · {product.stock} in stock
                    </p>
                    <strong className="mt-2 block text-sm">
                      {moneyFromRupees(product.price)}
                    </strong>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(product);
                      setProductModal(true);
                    }}
                    className="flex-1 rounded-full border border-black/8 bg-white py-2.5 text-xs font-semibold"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => void archiveProduct(product.id)}
                    className="rounded-full border border-black/8 bg-white px-4 py-2.5 text-xs font-semibold text-[#a33a32]"
                  >
                    Archive
                  </button>
                  <button
                    type="button"
                    onClick={() => void archiveProduct(product.id)}
                    className="rounded-full border border-black/8 bg-white px-4 py-2.5 text-xs font-semibold text-[#a33a32]"
                  >
                    <Trash2 />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {!loading && tab === "inventory" ? (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <Metric
              label="Units in stock"
              value={inventorySummary.unitsInStock}
            />
            <Metric
              label="Low-stock products"
              value={inventorySummary.lowStockProducts}
            />
            <Metric
              label="Inventory value"
              value={moneyFromPaise(inventorySummary.stockValue)}
            />
          </div>
          <section className="panel p-5">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-[#efeee8]">
                <PackagePlus size={18} />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[.14em] text-[#99978f]">
                  Stock entry
                </p>
                <h2 className="mt-1 text-xl font-semibold">
                  Add or remove inventory
                </h2>
              </div>
            </div>
            <form
              onSubmit={adjustInventory}
              className="mt-5 grid gap-4 md:grid-cols-[1.2fr_.55fr_1.2fr_auto]"
            >
              <label className="text-xs font-semibold">
                Product
                <select required name="productId" className="input-ui mt-2">
                  <option value="">Select product</option>
                  {products
                    .filter((product) => product.status !== "ARCHIVED")
                    .map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} ({product.stock})
                      </option>
                    ))}
                </select>
              </label>
              <label className="text-xs font-semibold">
                Quantity change
                <input
                  required
                  name="quantityDelta"
                  type="number"
                  placeholder="25 or -5"
                  className="input-ui mt-2"
                />
              </label>
              <label className="text-xs font-semibold">
                Reason
                <input
                  required
                  name="reason"
                  placeholder="New supplier stock"
                  className="input-ui mt-2"
                />
              </label>
              <button className="mt-auto inline-flex h-[43px] items-center justify-center gap-2 rounded-full bg-[#191a17] px-5 text-xs font-semibold text-white">
                <Plus size={15} /> Update
              </button>
            </form>
          </section>
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Inventory ledger</h2>
              <span className="text-xs text-[#85847d]">Last 300 movements</span>
            </div>
            <div className="table-shell">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Change</th>
                    <th>Balance</th>
                    <th>Reason</th>
                    <th>Actor</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map((entry) => (
                    <tr key={entry.id}>
                      <td>
                        <strong>{entry.product}</strong>
                        <span className="mt-1 block text-[11px] text-[#85847d]">
                          {entry.sku}
                        </span>
                      </td>
                      <td
                        className={
                          entry.quantityDelta > 0
                            ? "text-[#397230]"
                            : "text-[#a33a32]"
                        }
                      >
                        {entry.quantityDelta > 0 ? "+" : ""}
                        {entry.quantityDelta}
                      </td>
                      <td>{entry.resultingQuantity}</td>
                      <td>{entry.reason}</td>
                      <td>{entry.actor ?? "System"}</td>
                      <td>{dateTime(entry.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : null}

      {!loading && tab === "orders" ? (
        <section>
          <div className="mb-4">
            <p className="text-xs font-bold uppercase tracking-[.14em] text-[#99978f]">
              Commerce
            </p>
            <h2 className="mt-2 text-2xl font-semibold">Orders</h2>
          </div>
          <div className="hide-scrollbar mb-5 flex gap-2 overflow-x-auto pb-1">
            <button type="button" onClick={() => setOrderStatus("all")} className={`whitespace-nowrap rounded-full px-4 py-2.5 text-xs font-semibold ${orderStatus === "all" ? "bg-[#191a17] text-white" : "border border-black/7 bg-white"}`}>All <span className="ml-1 opacity-60">{orders.length}</span></button>
            {orderStatuses.map((status) => { const count = orders.filter((order) => order.status === status).length; return <button type="button" key={status} onClick={() => setOrderStatus(status)} className={`whitespace-nowrap rounded-full px-4 py-2.5 text-xs font-semibold ${orderStatus === status ? "bg-[#191a17] text-white" : "border border-black/7 bg-white"}`}>{status.replaceAll("_", " ").toLowerCase()} <span className="ml-1 opacity-60">{count}</span></button>; })}
          </div>
          <div className="space-y-3">
            {filteredOrders.map((order) => (
              <article key={order.id} className="panel p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong>{order.trackingCode}</strong>
                      <span className="status-pill">
                        {order.status.replaceAll("_", " ")}
                      </span>
                      <span className="status-pill">{order.paymentStatus}</span>
                    </div>
                    <p className="mt-2 text-sm font-medium">
                      {order.customer} · {order.phone}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[#77766f]">
                      {order.address}
                    </p>
                    <p className="mt-2 text-xs text-[#85847d]">
                      {order.items
                        .map((item) => `${item.quantity}× ${item.name}`)
                        .join(", ")}
                    </p>
                  </div>
                  <strong className="text-xl">{moneyFromRupees(order.total)}</strong>
                  <div className="grid min-w-[230px] gap-2 sm:grid-cols-2">
                    <select
                      value={order.status}
                      onChange={(event) =>
                        void updateOrder(order, { status: event.target.value })
                      }
                      className="input-ui text-xs"
                    >
                      <option>PLACED</option>
                      <option>CONFIRMED</option>
                      <option>PACKING</option>
                      <option>READY</option>
                      <option>OUT_FOR_DELIVERY</option>
                      <option>DELIVERED</option>
                      <option>CANCELLED</option>
                    </select>
                    <select
                      value={order.paymentStatus}
                      onChange={(event) =>
                        void updateOrder(order, {
                          paymentStatus: event.target.value,
                        })
                      }
                      className="input-ui text-xs"
                    >
                      <option>PENDING</option>
                      <option>PAID</option>
                      <option>FAILED</option>
                      <option>REFUNDED</option>
                    </select>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {!loading && tab === "users" ? (
        <section className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <Metric label="Registered users" value={customers.length} />
            <Metric label="Active accounts" value={customers.filter((user) => user.active).length} />
            <Metric label="Customer revenue" value={moneyFromPaise(customers.reduce((sum, user) => sum + Number(user.spend ?? 0), 0))} />
          </div>
          <div>
            <div className="mb-4"><p className="text-xs font-bold uppercase tracking-[.14em] text-[#99978f]">Customers</p><h2 className="mt-2 text-2xl font-semibold">User accounts</h2><p className="mt-1 text-xs text-[#77766f]">Customer logins created from the storefront.</p></div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {customers.map((customer) => (
                <article key={customer.id} className="panel p-5">
                  <div className="flex items-start justify-between gap-3"><div className="min-w-0"><strong className="block truncate">{customer.name}</strong><p className="mt-1 truncate text-xs text-[#77766f]">{customer.email}</p><p className="mt-1 text-xs text-[#99978f]">{customer.phone || "No phone"}</p></div><span className={`status-pill ${customer.active ? "" : "opacity-50"}`}>{customer.active ? "ACTIVE" : "DISABLED"}</span></div>
                  <div className="mt-5 grid grid-cols-2 gap-2"><div className="rounded-2xl bg-[#f6f5f0] p-3"><span className="text-[10px] text-[#85847d]">Orders</span><strong className="mt-1 block text-lg">{customer.orders ?? 0}</strong></div><div className="rounded-2xl bg-[#f6f5f0] p-3"><span className="text-[10px] text-[#85847d]">Spend</span><strong className="mt-1 block text-lg">{moneyFromPaise(customer.spend ?? 0)}</strong></div></div>
                  <div className="mt-4 flex items-center justify-between text-[10px] text-[#99978f]"><span>Joined {new Date(customer.createdAt).toLocaleDateString("en-IN")}</span><button type="button" onClick={() => void toggleCustomer(customer)} className="rounded-full border border-black/8 bg-white px-3 py-2 text-[10px] font-semibold text-[#55544f]">{customer.active ? "Disable" : "Enable"}</button></div>
                </article>
              ))}
            </div>
            {customers.length === 0 ? <div className="panel p-10 text-center text-sm text-[#77766f]">No customer accounts have been created yet.</div> : null}
          </div>
        </section>
      ) : null}

      {!loading && tab === "riders" ? (
        <div className="space-y-5">
          <section className="panel overflow-hidden">
            <div className="flex flex-col gap-4 border-b border-black/6 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.14em] text-[#99978f]">
                  Live fleet
                </p>
                <h2 className="mt-2 text-2xl font-semibold">Track riders</h2>
                <p className="mt-1 text-xs text-[#77766f]">
                  Map positions refresh automatically every 10 seconds.
                </p>
              </div>
              <select
                value={selectedRider}
                onChange={(event) => setSelectedRider(event.target.value)}
                className="input-ui max-w-xs"
              >
                <option value="all">All active riders</option>
                {drivers.map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.name}
                  </option>
                ))}
              </select>
            </div>
            <MapClient
              className="h-[430px] rounded-none"
              points={fleetPoints}
            />
          </section>
          <div className="grid gap-4 lg:grid-cols-[.8fr_1.2fr]">
            <section className="panel p-5">
              <h3 className="text-lg font-semibold">Assign a rider</h3>
              <form onSubmit={assignDelivery} className="mt-4 space-y-4">
                <label className="text-xs font-semibold">
                  Unassigned order
                  <select required name="orderId" className="input-ui mt-2">
                    <option value="">Choose order</option>
                    {unassigned.map((order) => (
                      <option key={order.id} value={order.id}>
                        {order.trackingCode} · {order.customer}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-semibold">
                  Active rider
                  <select required name="driverId" className="input-ui mt-2">
                    <option value="">Choose rider</option>
                    {drivers
                      .filter((driver) => driver.active)
                      .map((driver) => (
                        <option key={driver.id} value={driver.id}>
                          {driver.name}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="text-xs font-semibold">
                  ETA in minutes
                  <input
                    name="etaMinutes"
                    type="number"
                    min="1"
                    max="1440"
                    defaultValue="30"
                    className="input-ui mt-2"
                  />
                </label>
                <button className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#191a17] py-3.5 text-xs font-semibold text-white">
                  <Truck size={16} /> Assign delivery
                </button>
              </form>
            </section>
            <section className="panel p-5">
              <h3 className="text-lg font-semibold">
                Active and recent deliveries
              </h3>
              <div className="mt-4 space-y-2">
                {deliveries.map((delivery) => (
                  <div
                    key={delivery.id}
                    className="flex flex-col gap-3 rounded-2xl border border-black/6 p-4 sm:flex-row sm:items-center"
                  >
                    <div className="min-w-0 flex-1">
                      <strong className="text-sm">
                        {delivery.trackingCode}
                      </strong>
                      <p className="mt-1 text-xs text-[#77766f]">
                        {delivery.driver ?? "Unassigned"} · {delivery.customer}
                      </p>
                      <p className="mt-1 text-[11px] text-[#99978f]">
                        Last GPS: {dateTime(delivery.lastLocationAt)}
                      </p>
                    </div>
                    <select
                      value={delivery.status}
                      onChange={(event) =>
                        void updateDelivery(delivery, event.target.value)
                      }
                      className="input-ui max-w-[190px] text-xs"
                    >
                      <option>UNASSIGNED</option>
                      <option>ASSIGNED</option>
                      <option>PICKED_UP</option>
                      <option>ON_THE_WAY</option>
                      <option>DELIVERED</option>
                      <option>FAILED</option>
                    </select>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      ) : null}

      {!loading && tab === "staff" ? (
        <section className="panel p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.14em] text-[#99978f]">
                Access
              </p>
              <h2 className="mt-2 text-2xl font-semibold">Staff accounts</h2>
            </div>
            <button
              type="button"
              onClick={() => setStaffModal(true)}
              className="inline-flex items-center gap-2 rounded-full bg-[#191a17] px-5 py-3 text-xs font-semibold text-white"
            >
              <Plus size={15} /> Add staff
            </button>
          </div>
          <div className="table-shell mt-5">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <strong>{user.name}</strong>
                      <span className="mt-1 block text-[11px] text-[#85847d]">
                        {user.email}
                      </span>
                    </td>
                    <td>{user.role}</td>
                    <td>{user.phone ?? "—"}</td>
                    <td>
                      <span className="status-pill">
                        {user.active ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => void toggleStaff(user)}
                        className="rounded-full border border-black/8 px-3 py-2 text-xs font-semibold"
                      >
                        {user.active ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {!loading && tab === "audit" ? (
        <section>
          <div className="mb-4">
            <p className="text-xs font-bold uppercase tracking-[.14em] text-[#99978f]">
              Compliance
            </p>
            <h2 className="mt-2 text-2xl font-semibold">Audit log</h2>
          </div>
          <div className="table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Actor</th>
                  <th>Metadata</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {audit.map((entry) => (
                  <tr key={entry.id}>
                    <td>
                      <span className="status-pill">{entry.action}</span>
                    </td>
                    <td>
                      {entry.entityType}
                      <span className="mt-1 block max-w-[150px] truncate text-[11px] text-[#85847d]">
                        {entry.entityId}
                      </span>
                    </td>
                    <td>
                      {entry.actor ?? "System"}
                      <span className="mt-1 block text-[11px] text-[#85847d]">
                        {entry.actorEmail}
                      </span>
                    </td>
                    <td>
                      <code className="block max-w-[260px] truncate text-[11px]">
                        {JSON.stringify(entry.metadata)}
                      </code>
                    </td>
                    <td>{dateTime(entry.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {productModal ? (
        <div className="modal-backdrop">
          <form onSubmit={saveProduct} className="modal-card p-5 md:p-7">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.14em] text-[#99978f]">
                  Catalog editor
                </p>
                <h2 className="mt-2 text-2xl font-semibold">
                  {editing ? "Edit product" : "Add product"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setProductModal(false);
                  setEditing(null);
                }}
                className="grid size-10 place-items-center rounded-full bg-white"
              >
                <X size={18} />
              </button>
            </div>
            <input
              type="hidden"
              name="existingImageUrl"
              defaultValue={editing?.imageUrl ?? ""}
            />
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field label="Product name">
                <input
                  name="name"
                  required
                  defaultValue={editing?.name}
                  className="input-ui mt-2"
                />
              </Field>
              <Field label="SKU">
                <input
                  name="sku"
                  required
                  defaultValue={editing?.sku}
                  className="input-ui mt-2"
                />
              </Field>
              <Field label="Slug">
                <input
                  name="slug"
                  required
                  pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                  defaultValue={editing?.slug}
                  placeholder="cadbury-dairy-milk-110g"
                  className="input-ui mt-2"
                />
              </Field>
              <Field label="Category">
                <select
                  name="categoryId"
                  required
                  defaultValue={editing?.categoryId}
                  className="input-ui mt-2"
                >
                  <option value="">Select category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Selling price">
                <input
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  defaultValue={editing?.price}
                  className="input-ui mt-2"
                />
              </Field>
              <Field label="MRP">
                <input
                  name="mrp"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={editing?.mrp ?? ""}
                  className="input-ui mt-2"
                />
              </Field>
              <Field label="Unit">
                <input
                  name="unit"
                  required
                  defaultValue={editing?.unit}
                  placeholder="1 kg"
                  className="input-ui mt-2"
                />
              </Field>
              <Field label="Status">
                <select
                  name="status"
                  defaultValue={editing?.status ?? "ACTIVE"}
                  className="input-ui mt-2"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="DRAFT">Draft</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </Field>
              <Field label="Current stock">
                <input
                  name="stock"
                  type="number"
                  min="0"
                  required
                  defaultValue={editing?.stock ?? 0}
                  className="input-ui mt-2"
                />
              </Field>
              <Field label="Low-stock threshold">
                <input
                  name="reorderAt"
                  type="number"
                  min="0"
                  required
                  defaultValue={editing?.reorderAt ?? 10}
                  className="input-ui mt-2"
                />
              </Field>
              <label className="text-xs font-semibold sm:col-span-2">
                Description
                <textarea
                  name="description"
                  rows={4}
                  required
                  defaultValue={editing?.description}
                  className="input-ui mt-2 resize-none"
                />
              </label>
              <label className="text-xs font-semibold sm:col-span-2">
                Product image
                <input
                  name="image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  className="mt-2 block w-full rounded-2xl border border-dashed border-black/15 bg-white p-4 text-xs"
                />
                <span className="mt-2 flex items-center gap-2 text-[11px] font-normal text-[#85847d]">
                  <Upload size={13} /> JPG, PNG, WebP or AVIF, maximum 5 MB.
                  Images are stored in PostgreSQL.
                </span>
              </label>
              {editing?.imageUrl ? (
                <div className="sm:col-span-2">
                  <ProductMedia
                    imageUrl={editing.imageUrl}
                    name={editing.name}
                    className="h-44 rounded-2xl"
                  />
                </div>
              ) : null}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setProductModal(false);
                  setEditing(null);
                }}
                className="rounded-full border border-black/8 bg-white px-5 py-3 text-xs font-semibold"
              >
                Cancel
              </button>
              <button className="rounded-full bg-[#191a17] px-6 py-3 text-xs font-semibold text-white">
                Save product
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {categoryModal ? (
        <div className="modal-backdrop">
          <form onSubmit={createCategory} className="modal-card max-w-xl p-5 md:p-7">
            <div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#99978f]">Catalog</p><h2 className="mt-2 text-2xl font-semibold">New category</h2></div><button type="button" onClick={() => setCategoryModal(false)} className="grid size-10 place-items-center rounded-full bg-white"><X size={18} /></button></div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field label="Category name"><input name="name" required className="input-ui mt-2" placeholder="Beverages" /></Field>
              <Field label="Slug"><input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" className="input-ui mt-2" placeholder="beverages" /></Field>
              <Field label="Icon"><input name="icon" className="input-ui mt-2" defaultValue="📦" maxLength={16} /></Field>
              <Field label="Sort order"><input name="sortOrder" type="number" min="0" defaultValue="0" className="input-ui mt-2" /></Field>
              <label className="text-xs font-semibold sm:col-span-2">Description<textarea name="description" rows={3} className="input-ui mt-2 resize-none" /></label>
            </div>
            <button className="mt-6 w-full rounded-full bg-[#191a17] py-3.5 text-xs font-semibold text-white">Create category</button>
          </form>
        </div>
      ) : null}

      {staffModal ? (
        <div className="modal-backdrop">
          <form
            onSubmit={createStaff}
            className="modal-card max-w-xl p-5 md:p-7"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">Add staff account</h2>
              <button
                type="button"
                onClick={() => setStaffModal(false)}
                className="grid size-10 place-items-center rounded-full bg-white"
              >
                <X size={18} />
              </button>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field label="Name">
                <input name="name" required className="input-ui mt-2" />
              </Field>
              <Field label="Email">
                <input
                  name="email"
                  type="email"
                  required
                  className="input-ui mt-2"
                />
              </Field>
              <Field label="Phone">
                <input name="phone" className="input-ui mt-2" />
              </Field>
              <Field label="Role">
                <select name="role" className="input-ui mt-2">
                  <option value="DELIVERY">Delivery rider</option>
                  <option value="ADMIN">Administrator</option>
                </select>
              </Field>
              <label className="text-xs font-semibold sm:col-span-2">
                Temporary password
                <input
                  name="password"
                  type="password"
                  minLength={12}
                  maxLength={72}
                  required
                  className="input-ui mt-2"
                />
              </label>
            </div>
            <button className="mt-6 w-full rounded-full bg-[#191a17] py-3.5 text-xs font-semibold text-white">
              Create account
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <article className="panel p-5">
      <span className="text-xs font-semibold text-[#85847d]">{label}</span>
      <strong className="mt-4 block text-3xl font-semibold tracking-[-.04em]">
        {value}
      </strong>
    </article>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="text-xs font-semibold">
      {label}
      {children}
    </label>
  );
}
