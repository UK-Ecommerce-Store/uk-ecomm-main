import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { requestUser } from "@/lib/auth";
import { withTransaction } from "@/lib/db";
import { apiError, assertSameOrigin, HttpError } from "@/lib/http";
import { orderCreateSchema } from "@/lib/validation";
import { isInsideSurat, SURAT_SERVICE_AREA } from "@/lib/service-area";

function trackingCode() {
  return `UK-${Date.now().toString(36).toUpperCase()}-${randomBytes(8).toString("hex").toUpperCase()}`;
}

type ResolvedAddress = {
  label: string | null;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
  lat: number | null;
  lng: number | null;
};

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const input = orderCreateSchema.parse(await request.json());
    const signedIn = await requestUser(request);
    const customerUserId = signedIn?.role === "CUSTOMER" ? signedIn.id : null;
    const customerName = signedIn?.role === "CUSTOMER" ? signedIn.name : input.customerName;
    const customerEmail = signedIn?.role === "CUSTOMER" ? signedIn.email : input.customerEmail;
    const customerPhone = signedIn?.role === "CUSTOMER" && signedIn.phone ? signedIn.phone : input.customerPhone;

    const items = Array.from(input.items.reduce((map, item) => {
      map.set(item.productId, (map.get(item.productId) ?? 0) + item.quantity);
      return map;
    }, new Map<string, number>()), ([productId, quantity]) => ({ productId, quantity }));
    if (items.some((item) => item.quantity > 50)) throw new HttpError(400, "A product quantity cannot exceed 50");
    const storeLat = Number(process.env.NEXT_PUBLIC_STORE_LAT ?? SURAT_SERVICE_AREA.center[0]);
    const storeLng = Number(process.env.NEXT_PUBLIC_STORE_LNG ?? SURAT_SERVICE_AREA.center[1]);

    const result = await withTransaction(async (client) => {
      let shipping: ResolvedAddress = {
        label: input.addressLabel || null,
        line1: input.addressLine1,
        line2: input.addressLine2 || null,
        city: input.city,
        state: input.state,
        postalCode: input.postalCode,
        lat: input.destinationLat ?? null,
        lng: input.destinationLng ?? null,
      };

      if (input.addressId) {
        if (!customerUserId) throw new HttpError(401, "Sign in to use a saved address");
        const saved = await client.query<{
          label: string; address_line1: string; address_line2: string | null; city: string; state: string; postal_code: string; latitude: number | null; longitude: number | null;
        }>(`SELECT label,address_line1,address_line2,city,state,postal_code,latitude,longitude FROM customer_addresses WHERE id=$1 AND user_id=$2 LIMIT 1`, [input.addressId,customerUserId]);
        if (!saved.rowCount) throw new HttpError(404, "Saved address not found");
        const row = saved.rows[0];
        shipping = { label: row.label, line1: row.address_line1, line2: row.address_line2, city: row.city, state: row.state, postalCode: row.postal_code, lat: row.latitude, lng: row.longitude };
      }

      if (shipping.lat != null && shipping.lng != null && !isInsideSurat(shipping.lat, shipping.lng)) {
        throw new HttpError(400, "Delivery is currently available only within Surat city limits");
      }

      const ids = items.map((item) => item.productId);
      const products = await client.query<{
        id: string; sku: string; name: string; unit: string; price_paise: number; stock_quantity: number;
      }>(
        `SELECT id,sku,name,unit,price_paise,stock_quantity FROM products
         WHERE id = ANY($1::uuid[]) AND status='ACTIVE' FOR UPDATE`, [ids],
      );
      if (products.rowCount !== new Set(ids).size) throw new HttpError(400, "One or more products are unavailable");
      const byId = new Map(products.rows.map((product) => [product.id, product]));
      let subtotal = 0;
      for (const item of items) {
        const product = byId.get(item.productId)!;
        if (product.stock_quantity < item.quantity) throw new HttpError(409, `${product.name} has only ${product.stock_quantity} units available`);
        subtotal += product.price_paise * item.quantity;
      }
      const deliveryFee = subtotal >= 49900 ? 0 : 3000;
      const code = trackingCode();
      const order = await client.query<{ id: string; tracking_code: string }>(
        `INSERT INTO orders(tracking_code,customer_user_id,customer_name,customer_email,customer_phone,address_label,address_line1,address_line2,city,state,postal_code,
          destination_lat,destination_lng,subtotal_paise,delivery_fee_paise,total_paise,payment_method,payment_status,status,notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,'PLACED',$19)
         RETURNING id,tracking_code`,
        [code,customerUserId,customerName,customerEmail,customerPhone,shipping.label,shipping.line1,shipping.line2,shipping.city,shipping.state,shipping.postalCode,
          shipping.lat,shipping.lng,subtotal,deliveryFee,subtotal+deliveryFee,input.paymentMethod,"PENDING",input.notes || null],
      );
      for (const item of items) {
        const product = byId.get(item.productId)!;
        const resulting = product.stock_quantity - item.quantity;
        await client.query(
          `INSERT INTO order_items(order_id,product_id,sku,product_name,unit,unit_price_paise,quantity,line_total_paise)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [order.rows[0].id,product.id,product.sku,product.name,product.unit,product.price_paise,item.quantity,product.price_paise*item.quantity],
        );
        await client.query("UPDATE products SET stock_quantity=$1 WHERE id=$2", [resulting, product.id]);
        await client.query(
          `INSERT INTO inventory_movements(product_id,quantity_delta,resulting_quantity,reason,reference_type,reference_id)
           VALUES ($1,$2,$3,'Customer order','ORDER',$4)`, [product.id,-item.quantity,resulting,order.rows[0].id],
        );
      }
      await client.query(
        `INSERT INTO deliveries(order_id,status,store_lat,store_lng,destination_lat,destination_lng)
         VALUES ($1,'UNASSIGNED',$2,$3,$4,$5)`,
        [order.rows[0].id,storeLat,storeLng,shipping.lat,shipping.lng],
      );

      if (customerUserId && input.saveAddress && input.addressLabel?.trim()) {
        const hasDefault = await client.query<{ exists: boolean }>("SELECT EXISTS(SELECT 1 FROM customer_addresses WHERE user_id=$1 AND is_default=true) AS exists", [customerUserId]);
        await client.query(`INSERT INTO customer_addresses(user_id,label,address_line1,address_line2,city,state,postal_code,latitude,longitude,is_default)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
          ON CONFLICT (user_id,lower(label)) DO UPDATE SET address_line1=EXCLUDED.address_line1,address_line2=EXCLUDED.address_line2,city=EXCLUDED.city,state=EXCLUDED.state,
            postal_code=EXCLUDED.postal_code,latitude=EXCLUDED.latitude,longitude=EXCLUDED.longitude,is_default=(customer_addresses.is_default OR EXCLUDED.is_default)`,
          [customerUserId,input.addressLabel.trim(),shipping.line1,shipping.line2,shipping.city,shipping.state,shipping.postalCode,shipping.lat,shipping.lng,!hasDefault.rows[0].exists]);
      }

      return { trackingCode: order.rows[0].tracking_code, total: (subtotal + deliveryFee) / 100 };
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
