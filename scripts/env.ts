import { existsSync } from "node:fs";

for (const file of [".env.local", ".env"]) {
  if (existsSync(file)) {
    process.loadEnvFile(file);
    break;
  }
}

// Supabase Postgres is the primary database. DATABASE_URL remains a compatibility
// fallback for older deployments while they are being migrated.
if (!process.env.DATABASE_URL && process.env.SUPABASE_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.SUPABASE_DATABASE_URL;
}

if (!process.env.DATABASE_URL) {
  throw new Error("SUPABASE_DATABASE_URL is required (DATABASE_URL is accepted only as a legacy fallback).");
}

if (process.env.SUPABASE_DATABASE_URL && !process.env.DATABASE_SSL) {
  process.env.DATABASE_SSL = "true";
}
