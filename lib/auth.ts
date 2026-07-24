import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/http";

export type UserRole = "ADMIN" | "DELIVERY" | "CUSTOMER";
export interface AuthUser { id: string; name: string; email: string; role: UserRole; phone: string | null; }

const COOKIE_NAME = "uk_session";
const SESSION_DAYS = Number(process.env.SESSION_TTL_DAYS ?? 14);

const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createSession(userId: string, request: Request) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip");
  await db.query(
    `INSERT INTO sessions(user_id, token_hash, expires_at, ip_address, user_agent)
     VALUES ($1,$2,$3,$4,$5)`,
    [userId, tokenHash(token), expiresAt, ip || null, request.headers.get("user-agent")?.slice(0, 500) || null],
  );
  return { token, expiresAt };
}

export async function setWebSession(token: string, expiresAt: Date) {
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
    priority: "high",
  });
}

export async function clearWebSession() {
  const store = await cookies();
  store.set(COOKIE_NAME, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
}

async function cookieToken() {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value ?? null;
}

export function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  return authorization?.startsWith("Bearer ") ? authorization.slice(7).trim() : null;
}

export async function getUserByToken(token: string | null): Promise<AuthUser | null> {
  if (!token) return null;
  const result = await db.query<AuthUser>(
    `SELECT u.id,u.name,u.email,u.role,u.phone
     FROM sessions s JOIN users u ON u.id=s.user_id
     WHERE s.token_hash=$1 AND s.expires_at>now() AND u.active=true
     LIMIT 1`,
    [tokenHash(token)],
  );
  if (!result.rowCount) return null;
  void db.query("UPDATE sessions SET last_seen_at=now() WHERE token_hash=$1", [tokenHash(token)]).catch(() => undefined);
  return result.rows[0];
}

export async function currentUser(): Promise<AuthUser | null> {
  return getUserByToken(await cookieToken());
}

export async function requestUser(request: Request): Promise<AuthUser | null> {
  const bearer = bearerToken(request);
  if (bearer) return getUserByToken(bearer);
  const cookieHeader = request.headers.get("cookie") ?? "";
  const token = cookieHeader.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE_NAME}=`))?.slice(COOKIE_NAME.length + 1);
  return getUserByToken(token ? decodeURIComponent(token) : null);
}

export async function requireRequestUser(request: Request, roles?: UserRole[]) {
  const user = await requestUser(request);
  if (!user) throw new HttpError(401, "Authentication required");
  if (roles && !roles.includes(user.role)) throw new HttpError(403, "You do not have access to this resource");
  return user;
}

export async function requirePageUser(roles?: UserRole[]) {
  // Reading headers opts the page into dynamic rendering and gives a consistent request boundary.
  await headers();
  const user = await currentUser();
  if (!user) return null;
  if (roles && !roles.includes(user.role)) return null;
  return user;
}

export async function revokeSession(request: Request) {
  const bearer = bearerToken(request);
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookie = cookieHeader.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE_NAME}=`))?.slice(COOKIE_NAME.length + 1);
  const token = bearer ?? (cookie ? decodeURIComponent(cookie) : null);
  if (token) await db.query("DELETE FROM sessions WHERE token_hash=$1", [tokenHash(token)]);
}
