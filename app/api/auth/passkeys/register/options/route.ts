import { generateRegistrationOptions, type AuthenticatorTransportFuture } from "@simplewebauthn/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { passkeyConfig } from "@/lib/passkeys";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await requireRequestUser(request);
    const existing = await db.query<{ id: string; transports: string[] | null }>("SELECT id,transports FROM passkeys WHERE user_id=$1 ORDER BY created_at", [user.id]);
    const { rpName, rpID } = passkeyConfig(request);
    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userName: user.email,
      userDisplayName: user.name,
      userID: new TextEncoder().encode(user.id),
      attestationType: "none",
      excludeCredentials: existing.rows.map((passkey) => ({ id: passkey.id, transports: (passkey.transports ?? undefined) as AuthenticatorTransportFuture[] | undefined })),
      authenticatorSelection: { residentKey: "required", userVerification: "required" },
      supportedAlgorithmIDs: [-7, -257],
    });
    const store = await cookies();
    const secure = process.env.NODE_ENV === "production";
    store.set("uk_passkey_reg_challenge", options.challenge, { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: 300 });
    store.set("uk_passkey_reg_user", options.user.id, { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: 300 });
    store.set("uk_passkey_reg_account", user.id, { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: 300 });
    return NextResponse.json(options);
  } catch (error) { return apiError(error); }
}
