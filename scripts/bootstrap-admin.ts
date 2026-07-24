import "./env";
import bcrypt from "bcryptjs";
import pg from "pg";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined });

async function main() {
  const name = process.env.ADMIN_NAME?.trim();
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "";
  if (!name || !email || password.length < 12 || bcrypt.truncates(password) || /change_me|replace-with/i.test(password)) {
    throw new Error("Set ADMIN_NAME, ADMIN_EMAIL and an ADMIN_PASSWORD of 12-72 UTF-8 bytes.");
  }
  const hash = await bcrypt.hash(password, 12);
  const existing = await pool.query<{ id: string }>("SELECT id FROM users WHERE lower(email)=lower($1)", [email]);
  const result = existing.rowCount
    ? await pool.query("UPDATE users SET name=$1,email=$2,password_hash=$3,role='ADMIN',active=true,updated_at=now() WHERE id=$4 RETURNING id,email", [name,email,hash,existing.rows[0].id])
    : await pool.query("INSERT INTO users(name,email,password_hash,role,active) VALUES ($1,$2,$3,'ADMIN',true) RETURNING id,email", [name,email,hash]);
  console.log(`Admin ready: ${result.rows[0].email}`);
  await pool.end();
}

main().catch(async (error) => { console.error(error); await pool.end().catch(()=>undefined); process.exit(1); });
