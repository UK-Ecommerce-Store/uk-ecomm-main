import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import pg, { type Pool, type PoolClient } from "pg";
import { createClient } from "@supabase/supabase-js";

for (const file of [".env.local", ".env"]) {
  if (existsSync(file)) {
    process.loadEnvFile(file);
    break;
  }
}

const { Pool: PgPool } = pg;
const sourceUrl = process.env.SOURCE_DATABASE_URL ?? process.env.DATABASE_URL;
const targetUrl = process.env.SUPABASE_DATABASE_URL;
const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.SUPABASE_STORAGE_BUCKET || "product-images";
const replaceTarget = process.env.SUPABASE_MIGRATION_REPLACE_TARGET === "true";

if (!sourceUrl) throw new Error("Set SOURCE_DATABASE_URL to the existing PostgreSQL database.");
if (!targetUrl) throw new Error("Set SUPABASE_DATABASE_URL to the Supabase PostgreSQL connection string.");
if (sourceUrl === targetUrl) throw new Error("SOURCE_DATABASE_URL and SUPABASE_DATABASE_URL must point to different databases.");
if (!supabaseUrl || !serviceRole) throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY so legacy product images can move to Supabase Storage.");

const source = new PgPool({
  connectionString: sourceUrl,
  ssl: process.env.SOURCE_DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
});
const target = new PgPool({ connectionString: targetUrl, ssl: { rejectUnauthorized: false } });
const supabase = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });

const tableOrder = [
  "users",
  "sessions",
  "login_attempts",
  "categories",
  "products",
  "inventory_movements",
  "orders",
  "order_items",
  "deliveries",
  "delivery_locations",
  "audit_logs",
  "customer_addresses",
  "passkeys",
] as const;

const serialTables = ["login_attempts", "inventory_movements", "delivery_locations", "audit_logs"] as const;

function quoteIdent(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

async function tableExists(client: Pool | PoolClient, table: string) {
  const result = await client.query<{ exists: boolean }>(
    `SELECT to_regclass($1) IS NOT NULL AS exists`,
    [`public.${table}`],
  );
  return Boolean(result.rows[0]?.exists);
}

async function columns(client: Pool | PoolClient, table: string) {
  const result = await client.query<{ column_name: string }>(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`,
    [table],
  );
  return result.rows.map((row) => row.column_name);
}

async function applyTargetMigrations(client: PoolClient) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  const files = (await readdir(path.join(process.cwd(), "db", "migrations")))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const filename of files) {
    const exists = await client.query("SELECT 1 FROM schema_migrations WHERE filename=$1", [filename]);
    if (exists.rowCount) continue;
    const sql = await readFile(path.join(process.cwd(), "db", "migrations", filename), "utf8");
    console.log(`Applying target migration ${filename}`);
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations(filename) VALUES ($1)", [filename]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }
}

async function countTargetRows(client: PoolClient) {
  let total = 0;
  for (const table of tableOrder) {
    if (!(await tableExists(client, table))) continue;
    const result = await client.query<{ count: string }>(`SELECT count(*)::text AS count FROM ${quoteIdent(table)}`);
    total += Number(result.rows[0]?.count ?? 0);
  }
  return total;
}

async function clearTarget(client: PoolClient) {
  const existing: string[] = [];
  for (const table of tableOrder) if (await tableExists(client, table)) existing.push(quoteIdent(table));
  if (existing.length) await client.query(`TRUNCATE TABLE ${existing.join(", ")} RESTART IDENTITY CASCADE`);
}

async function copyTable(sourceClient: PoolClient, targetClient: PoolClient, table: string) {
  if (!(await tableExists(sourceClient, table)) || !(await tableExists(targetClient, table))) return;
  const sourceColumns = await columns(sourceClient, table);
  const targetColumns = new Set(await columns(targetClient, table));
  const shared = sourceColumns.filter((column) => targetColumns.has(column));
  if (!shared.length) return;

  const result = await sourceClient.query(`SELECT ${shared.map(quoteIdent).join(", ")} FROM ${quoteIdent(table)}`);
  if (!result.rowCount) {
    console.log(`${table}: 0 rows`);
    return;
  }

  const batchSize = 150;
  for (let offset = 0; offset < result.rows.length; offset += batchSize) {
    const batch = result.rows.slice(offset, offset + batchSize);
    const values: unknown[] = [];
    const rowsSql = batch.map((row, rowIndex) => {
      const placeholders = shared.map((column, columnIndex) => {
        values.push(row[column]);
        return `$${rowIndex * shared.length + columnIndex + 1}`;
      });
      return `(${placeholders.join(",")})`;
    });
    await targetClient.query(
      `INSERT INTO ${quoteIdent(table)} (${shared.map(quoteIdent).join(",")}) VALUES ${rowsSql.join(",")}`,
      values,
    );
  }
  console.log(`${table}: ${result.rowCount} rows`);
}

async function repairSerialSequence(client: PoolClient, table: string) {
  if (!(await tableExists(client, table))) return;
  const sequence = await client.query<{ sequence_name: string | null }>(
    `SELECT pg_get_serial_sequence($1, 'id') AS sequence_name`,
    [`public.${table}`],
  );
  const sequenceName = sequence.rows[0]?.sequence_name;
  if (!sequenceName) return;
  await client.query(
    `SELECT setval($1::regclass, GREATEST(COALESCE((SELECT max(id) FROM ${quoteIdent(table)}), 0), 1), COALESCE((SELECT max(id) FROM ${quoteIdent(table)}), 0) > 0)`,
    [sequenceName],
  );
}

function safeStorageName(name: string) {
  const cleaned = name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return cleaned.slice(0, 100) || "image";
}

async function ensureStorageBucket() {
  const found = await supabase.storage.getBucket(bucket);
  if (found.error && !/not found/i.test(found.error.message)) throw new Error(`Could not read Supabase Storage bucket: ${found.error.message}`);
  if (!found.data) {
    const created = await supabase.storage.createBucket(bucket, {
      public: true,
      fileSizeLimit: 5 * 1024 * 1024,
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/avif"],
    });
    if (created.error) throw new Error(`Could not create Supabase Storage bucket: ${created.error.message}`);
    return;
  }
  if (!found.data.public) {
    const updated = await supabase.storage.updateBucket(bucket, {
      public: true,
      fileSizeLimit: 5 * 1024 * 1024,
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/avif"],
    });
    if (updated.error) throw new Error(`Could not make Supabase Storage bucket public: ${updated.error.message}`);
  }
}

async function migrateLegacyMedia(sourceClient: PoolClient, targetClient: PoolClient) {
  if (!(await tableExists(sourceClient, "media_assets"))) {
    console.log("media_assets: source table not present; nothing to upload");
    return;
  }
  await ensureStorageBucket();
  const assets = await sourceClient.query<{
    id: string; file_name: string; mime_type: string; data: Buffer;
  }>("SELECT id,file_name,mime_type,data FROM media_assets ORDER BY created_at");

  let migrated = 0;
  for (const asset of assets.rows) {
    const storagePath = `migrated/${asset.id}-${safeStorageName(asset.file_name)}`;
    const upload = await supabase.storage.from(bucket).upload(storagePath, asset.data, {
      contentType: asset.mime_type,
      cacheControl: "31536000",
      upsert: true,
    });
    if (upload.error) throw new Error(`Could not upload media ${asset.id}: ${upload.error.message}`);
    const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath);
    if (!data.publicUrl) throw new Error(`Supabase returned no public URL for media ${asset.id}`);

    await targetClient.query(
      `UPDATE products SET image_url=$1
       WHERE image_url=$2 OR image_url LIKE $3`,
      [data.publicUrl, `/api/media/${asset.id}`, `%/api/media/${asset.id}`],
    );
    migrated += 1;
  }
  console.log(`media_assets: uploaded ${migrated} files to Supabase Storage and rewrote matching product URLs`);
}

async function main() {
  const sourceClient = await source.connect();
  const targetClient = await target.connect();
  try {
    await applyTargetMigrations(targetClient);
    const targetRows = await countTargetRows(targetClient);
    if (targetRows > 0 && !replaceTarget) {
      throw new Error(
        `Supabase target already contains ${targetRows} application rows. ` +
        "Use an empty Supabase database, or set SUPABASE_MIGRATION_REPLACE_TARGET=true only after taking a backup if you intentionally want to replace it.",
      );
    }
    if (replaceTarget && targetRows > 0) {
      console.log(`Clearing ${targetRows} existing target rows because SUPABASE_MIGRATION_REPLACE_TARGET=true`);
      await clearTarget(targetClient);
    }

    console.log("Copying application data to Supabase PostgreSQL...");
    await targetClient.query("BEGIN");
    try {
      for (const table of tableOrder) await copyTable(sourceClient, targetClient, table);
      for (const table of serialTables) await repairSerialSequence(targetClient, table);
      await targetClient.query("COMMIT");
    } catch (error) {
      await targetClient.query("ROLLBACK");
      throw error;
    }

    await migrateLegacyMedia(sourceClient, targetClient);
    console.log("Supabase migration complete. Set the app to use SUPABASE_DATABASE_URL and keep SUPABASE_SERVICE_ROLE_KEY server-only.");
  } finally {
    sourceClient.release();
    targetClient.release();
    await source.end();
    await target.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
