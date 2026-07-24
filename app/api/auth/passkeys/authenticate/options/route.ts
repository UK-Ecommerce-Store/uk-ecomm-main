import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { passkeyConfig } from "@/lib/passkeys";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { rpID } = passkeyConfig(request);
    const options = await generateAuthenticationOptions({ rpID, userVerification: "required" });
    const store = await cookies();
    store.set("uk_passkey_auth_challenge", options.challenge, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 300 });
    return NextResponse.json(options);
  } catch (error) { return apiError(error); }
}
