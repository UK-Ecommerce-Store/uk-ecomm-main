import { z } from "zod";
import { isSuratPostalCode } from "@/lib/service-area";

const imageUrlSchema = z.string().trim().max(2048).refine(
  (value) => value === "" || /^https?:\/\//i.test(value),
  "Use an uploaded image or a valid HTTP image URL",
);

export const loginSchema = z.object({
  email: z.email({ error: "Enter a valid email address" }).max(254, { error: "Email address is too long" }).transform((value) => value.trim().toLowerCase()),
  password: z.string().min(8, { error: "Password must be at least 8 characters" }).max(128, { error: "Password is too long" }),
});

export const customerRegistrationSchema = z.object({
  name: z.string().trim().min(2, { error: "Enter your full name" }).max(120, { error: "Name is too long" }),
  email: z.email({ error: "Enter a valid email address" }).max(254, { error: "Email address is too long" }).transform((value) => value.trim().toLowerCase()),
  phone: z.string().trim().min(8, { error: "Enter a valid phone number" }).max(20, { error: "Phone number is too long" }),
  password: z.string().min(8, { error: "Password must be at least 8 characters" }).max(72, { error: "Password must be at most 72 characters" }),
});

export const categorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100),
  icon: z.string().trim().max(16).default("📦"),
  description: z.string().trim().max(500).nullable().optional(),
  sortOrder: z.coerce.number().int().min(0).max(10000).default(0),
  active: z.boolean().default(true),
});

export const productSchema = z.object({
  categoryId: z.uuid(),
  sku: z.string().trim().min(2).max(64),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120),
  name: z.string().trim().min(2).max(180),
  description: z.string().trim().max(5000),
  unit: z.string().trim().min(1).max(40),
  price: z.coerce.number().min(0).max(10_000_000),
  mrp: z.coerce.number().min(0).max(10_000_000).nullable().optional(),
  stock: z.coerce.number().int().min(0).max(10_000_000),
  reorderAt: z.coerce.number().int().min(0).max(10_000_000),
  imageUrl: z.union([imageUrlSchema, z.null()]).optional(),
  emoji: z.string().trim().max(16).default(""),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]),
}).superRefine((value, context) => {
  if (value.mrp != null && value.mrp < value.price) {
    context.addIssue({ code: "custom", path: ["mrp"], message: "MRP cannot be lower than the selling price" });
  }
});


export const customerAddressSchema = z.object({
  label: z.string().trim().min(1, "Give this address a name such as Home or Office").max(40),
  addressLine1: z.string().trim().min(5, "Enter the house, building and street").max(240),
  addressLine2: z.string().trim().max(240).nullable().optional(),
  city: z.string().trim().transform(() => "Surat"),
  state: z.string().trim().transform(() => "Gujarat"),
  postalCode: z.string().trim().refine(isSuratPostalCode, "Enter a Surat postal code beginning with 394 or 395"),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  isDefault: z.boolean().default(false),
}).superRefine((value, context) => {
  if ((value.latitude == null) !== (value.longitude == null)) {
    context.addIssue({ code: "custom", path: ["latitude"], message: "Latitude and longitude must be supplied together" });
  }
});

export const orderCreateSchema = z.object({
  customerName: z.string().trim().min(2).max(120),
  customerEmail: z.email().max(254).transform((value) => value.toLowerCase()),
  customerPhone: z.string().trim().min(8).max(20),
  addressId: z.uuid().nullable().optional(),
  addressLabel: z.string().trim().max(40).nullable().optional(),
  saveAddress: z.boolean().optional().default(false),
  addressLine1: z.string().trim().min(5).max(240),
  addressLine2: z.string().trim().max(240).optional(),
  city: z.string().trim().transform(() => "Surat"),
  state: z.string().trim().transform(() => "Gujarat"),
  postalCode: z.string().trim().refine(isSuratPostalCode, "Enter a Surat postal code beginning with 394 or 395"),
  destinationLat: z.number().min(-90).max(90).nullable().optional(),
  destinationLng: z.number().min(-180).max(180).nullable().optional(),
  paymentMethod: z.literal("COD"),
  notes: z.string().trim().max(1000).optional(),
  items: z.array(z.object({ productId: z.uuid(), quantity: z.number().int().min(1).max(50) })).min(1).max(100),
}).superRefine((value, context) => {
  if ((value.destinationLat == null) !== (value.destinationLng == null)) {
    context.addIssue({ code: "custom", path: ["destinationLat"], message: "Latitude and longitude must be supplied together" });
  }
});

export const staffSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(12).max(72),
  role: z.enum(["ADMIN", "DELIVERY"]),
  phone: z.string().trim().max(20).nullable().optional(),
  active: z.boolean().default(true),
});

export const deliveryLocationSchema = z.object({
  deliveryId: z.uuid(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().min(0).max(10000).nullable().optional(),
  heading: z.number().min(0).max(360).nullable().optional(),
  speed: z.number().min(0).max(200).nullable().optional(),
  capturedAt: z.iso.datetime(),
});

export const inventoryAdjustmentSchema = z.object({
  productId: z.uuid(),
  quantityDelta: z.coerce.number().int().min(-1_000_000).max(1_000_000).refine((value) => value !== 0, "Quantity change cannot be zero"),
  reason: z.string().trim().min(3).max(240),
});
