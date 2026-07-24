import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { createSession, setWebSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, assertSameOrigin, HttpError, requestIp } from "@/lib/http";
import { loginSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const input = loginSchema.parse(await request.json());
    const ip = requestIp(request);
    const attempts = await db.query<{ count: number }>(
      `SELECT count(*)::int AS count FROM login_attempts
       WHERE lower(email)=lower($1) AND ip_address=$2 AND succeeded=false AND created_at > now()-interval '15 minutes'`,
      [input.email, ip],
    );
    if (attempts.rows[0].count >= 8) throw new HttpError(429, "Too many login attempts. Try again later.");

    const result = await db.query<{ id: string; name: string; email: string; password_hash: string; role: "ADMIN" | "DELIVERY" | "CUSTOMER"; active: boolean }>(
      `SELECT id,name,email,password_hash,role,active FROM users WHERE lower(email)=lower($1) LIMIT 1`, [input.email],
    );
    const user = result.rows[0];
    const valid = Boolean(user?.active) && !bcrypt.truncates(input.password) && await bcrypt.compare(input.password, user.password_hash);
    await db.query("INSERT INTO login_attempts(email,ip_address,succeeded) VALUES ($1,$2,$3)", [input.email, ip, valid]);
    if (!valid) throw new HttpError(401, "Invalid email or password");

    const session = await createSession(user.id, request);
    const mobile = ["android", "ios"].includes(request.headers.get("x-client-platform")?.toLowerCase() ?? "");
    if (!mobile) await setWebSession(session.token, session.expiresAt);

    return NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      expiresAt: session.expiresAt.toISOString(),
      ...(mobile ? { sessionToken: session.token } : {}),
    });
  } catch (error) {
    return apiError(error);
  }
}
