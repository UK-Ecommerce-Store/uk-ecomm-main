import { verifyAuthenticationResponse, type AuthenticationResponseJSON, type AuthenticatorTransportFuture } from "@simplewebauthn/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createSession, setWebSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, assertSameOrigin, HttpError } from "@/lib/http";
import { passkeyConfig } from "@/lib/passkeys";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const response = await request.json() as AuthenticationResponseJSON;
    const store = await cookies();
    const challenge = store.get("uk_passkey_auth_challenge")?.value;
    if (!challenge) throw new HttpError(400, "Passkey sign-in expired. Try again.");
    const result = await db.query<{
      id: string; public_key: Buffer; counter: number; transports: string[] | null; webauthn_user_id: string;
      user_id: string; name: string; email: string; role: "ADMIN" | "DELIVERY" | "CUSTOMER"; active: boolean;
    }>(`SELECT p.id,p.public_key,p.counter,p.transports,p.webauthn_user_id,u.id AS user_id,u.name,u.email,u.role,u.active
       FROM passkeys p JOIN users u ON u.id=p.user_id WHERE p.id=$1 LIMIT 1`, [response.id]);
    const passkey = result.rows[0];
    if (!passkey || !passkey.active) throw new HttpError(401, "This passkey is not linked to an active account");
    if (response.response.userHandle && response.response.userHandle !== passkey.webauthn_user_id) {
      throw new HttpError(401, "This passkey does not belong to the selected account");
    }
    const { rpID, origin } = passkeyConfig(request);
    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: { id: passkey.id, publicKey: new Uint8Array(passkey.public_key), counter: Number(passkey.counter), transports: (passkey.transports ?? undefined) as AuthenticatorTransportFuture[] | undefined },
    });
    if (!verification.verified) throw new HttpError(401, "Passkey verification failed");
    await db.query("UPDATE passkeys SET counter=$1,last_used_at=now() WHERE id=$2", [verification.authenticationInfo.newCounter,passkey.id]);
    const session = await createSession(passkey.user_id, request);
    const mobile = ["android", "ios"].includes(request.headers.get("x-client-platform")?.toLowerCase() ?? "");
    if (!mobile) await setWebSession(session.token, session.expiresAt);
    store.set("uk_passkey_auth_challenge", "", { path: "/", maxAge: 0 });
    return NextResponse.json({
      verified: true,
      user: { id: passkey.user_id, name: passkey.name, email: passkey.email, role: passkey.role },
      expiresAt: session.expiresAt.toISOString(),
      ...(mobile ? { sessionToken: session.token } : {}),
    });
  } catch (error) { return apiError(error); }
}
