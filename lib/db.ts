import "server-only";
import pg from "pg";

const { Pool, types } = pg;

types.setTypeParser(20, (value) => Number(value));
types.setTypeParser(1700, (value) => Number(value));

declare global {
  var ukDatabasePool: pg.Pool | undefined;
}

function createPool() {
  return new Pool({
    // A non-routable local fallback lets Next.js compile before deployment
    // variables are injected. Any actual query still fails clearly.
    connectionString: process.env.SUPABASE_DATABASE_URL ?? process.env.DATABASE_URL ?? "postgresql://invalid:invalid@127.0.0.1:1/invalid",
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    idleTimeoutMillis: 30_000,
    allowExitOnIdle: true,
    connectionTimeoutMillis: 10_000,
    ssl: (process.env.DATABASE_SSL === "true" || Boolean(process.env.SUPABASE_DATABASE_URL)) ? { rejectUnauthorized: false } : undefined,
  });
}

export const db = globalThis.ukDatabasePool ?? createPool();
if (process.env.NODE_ENV !== "production") globalThis.ukDatabasePool = db;

export async function withTransaction<T>(callback: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
