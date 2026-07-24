export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string | null;
}

export interface Product {
  id: string;
  categoryId: string;
  category: string;
  categorySlug: string;
  sku: string;
  slug: string;
  name: string;
  description: string;
  unit: string;
  price: number;
  mrp: number | null;
  stock: number;
  reorderAt: number;
  imageUrl: string | null;
  emoji: string;
  accent: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
}


export interface CustomerAddress {
  id: string;
  label: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string;
  latitude: number | null;
  longitude: number | null;
  isDefault: boolean;
}

export interface CartItem { productId: string; quantity: number; }

export interface TrackingSnapshot {
  order: {
    trackingCode: string;
    status: string;
    customerName: string;
    city: string;
    createdAt: string;
    estimatedArrival: string | null;
  };
  delivery: null | {
    id: string;
    status: string;
    driverName: string | null;
    driverPhone: string | null;
    store: [number, number];
    destination: [number, number] | null;
    current: [number, number] | null;
    lastLocationAt: string | null;
  };
  path: Array<[number, number]>;
}
