import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { createSession, setWebSession } from "@/lib/auth";
import { withTransaction } from "@/lib/db";
import { apiError, assertSameOrigin, HttpError } from "@/lib/http";
import { customerRegistrationSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const input = customerRegistrationSchema.parse(await request.json());
    if (bcrypt.truncates(input.password)) {
      throw new HttpError(400, "Password exceeds bcrypt's 72-byte limit");
    }
    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await withTransaction(async (client) => {
      const existing = await client.query("SELECT 1 FROM users WHERE lower(email)=lower($1)", [input.email]);
      if (existing.rowCount) throw new HttpError(409, "An account already exists for this email");
      const result = await client.query<{ id: string; name: string; email: string; phone: string | null }>(
        `INSERT INTO users(name,email,password_hash,role,phone,active)
         VALUES ($1,$2,$3,'CUSTOMER',$4,true)
         RETURNING id,name,email,phone`,
        [input.name, input.email, passwordHash, input.phone],
      );
      return result.rows[0];
    });
    const session = await createSession(user.id, request);
    await setWebSession(session.token, session.expiresAt);
    return NextResponse.json({ user: { ...user, role: "CUSTOMER" } }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
