import "./env";
import pg from "pg";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined });

const categories = [
  ["Chocolate & Snacks", "chocolate-snacks", "", "Chocolate, biscuits and quick snacks", 10],
  ["Frozen", "frozen", "", "Ice cream and frozen favourites", 20],
  ["Pantry", "pantry", "", "Atta, grains and kitchen essentials", 30],
  ["Fashion", "fashion", "", "Simple everyday clothing", 40],
  ["Vegetables", "vegetables", "", "Fresh vegetables selected for daily cooking", 50],
  ["Fruits", "fruits", "", "Fresh seasonal and everyday fruit", 60],
  ["Dairy", "dairy", "", "Milk and dairy essentials", 70],
];

const products = [
  ["UK-CH-001", "cadbury-dairy-milk-110g", "Cadbury Dairy Milk", "chocolate-snacks", "Classic smooth milk chocolate for a quick treat or sharing.", "110 g", 9900, 11000, 80, 15, "", "#eee9df"],
  ["UK-FRZ-001", "vanilla-ice-cream-700ml", "Vanilla Ice Cream", "frozen", "Creamy vanilla ice cream packed for family desserts and late-night cravings.", "700 ml", 18900, 22000, 35, 10, "", "#f2eee4"],
  ["UK-AT-001", "whole-wheat-atta-5kg", "Whole Wheat Atta", "pantry", "Stone-ground whole wheat flour suitable for soft rotis and everyday cooking.", "5 kg", 28900, 32500, 60, 12, "", "#eee8dc"],
  ["UK-FA-001", "classic-cotton-tshirt", "Classic Cotton T-Shirt", "fashion", "Minimal regular-fit cotton T-shirt for daily wear. Available in standard sizes.", "1 piece", 49900, 69900, 28, 8, "", "#e8e8e4"],
  ["UK-VEG-001", "fresh-tomatoes-1kg", "Fresh Tomatoes", "vegetables", "Firm, ripe tomatoes selected for curries, salads and sauces.", "1 kg", 4900, 6000, 75, 20, "", "#f1e9e5"],
  ["UK-VEG-002", "fresh-potatoes-1kg", "Fresh Potatoes", "vegetables", "Versatile everyday potatoes, cleaned and packed for convenient storage.", "1 kg", 4200, 5200, 90, 25, "", "#eee9df"],
  ["UK-VEG-003", "fresh-onions-1kg", "Fresh Onions", "vegetables", "Daily-use onions selected for consistent size and freshness.", "1 kg", 4600, 5500, 85, 20, "", "#eee6e4"],
  ["UK-FRU-001", "banana-robusta-dozen", "Robusta Bananas", "fruits", "Naturally sweet bananas for breakfast, shakes and quick snacks.", "1 dozen", 6500, 7500, 55, 15, "", "#f2eedc"],
  ["UK-FRU-002", "royal-gala-apples-1kg", "Royal Gala Apples", "fruits", "Crisp, mildly sweet apples packed after quality inspection.", "1 kg", 18900, 22000, 38, 10, "", "#efe5e2"],
  ["UK-FRU-003", "kesar-mangoes-1kg", "Kesar Mangoes", "fruits", "Fragrant seasonal Kesar mangoes sourced for rich flavour and colour.", "1 kg", 24900, 29900, 32, 10, "", "#f2ead8"],
  ["UK-MILK-001", "amul-taaza-milk-500ml", "Amul Taaza Milk", "dairy", "Full cream milk for tea, coffee, desserts and daily use.", "500 ml", 3400, null, 100, 25, "", "#e8ecef"],
];

async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("UPDATE categories SET active=false WHERE slug = ANY($1::text[])", [["fresh", "bakery", "drinks", "home"]]);

    for (const category of categories) {
      await client.query(
        `INSERT INTO categories(name,slug,icon,description,sort_order)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name,description=EXCLUDED.description,sort_order=EXCLUDED.sort_order,active=true`,
        category,
      );
    }

    for (const product of products) {
      await client.query(
        `INSERT INTO products(sku,slug,name,category_id,description,unit,price_paise,mrp_paise,stock_quantity,reorder_level,emoji,accent,status)
         SELECT $1,$2,$3,c.id,$5,$6,$7,$8,$9,$10,$11,$12,'ACTIVE'::product_status FROM categories c WHERE c.slug=$4
         ON CONFLICT (sku) DO UPDATE SET slug=EXCLUDED.slug,name=EXCLUDED.name,category_id=EXCLUDED.category_id,description=EXCLUDED.description,
           unit=EXCLUDED.unit,price_paise=EXCLUDED.price_paise,mrp_paise=EXCLUDED.mrp_paise,reorder_level=EXCLUDED.reorder_level,
           accent=EXCLUDED.accent,status='ACTIVE'`,
        product,
      );
    }

    await client.query(`INSERT INTO inventory_movements(product_id,quantity_delta,resulting_quantity,reason,reference_type,reference_id)
      SELECT p.id,p.stock_quantity,p.stock_quantity,'Initial Surat catalog seed','SEED',p.id::text
      FROM products p WHERE p.stock_quantity>0 AND NOT EXISTS (SELECT 1 FROM inventory_movements m WHERE m.product_id=p.id)`);
    await client.query("COMMIT");
    console.log("Surat categories and starter inventory seeded successfully.");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => { console.error(error); process.exit(1); });
