import { verifyRegistrationResponse, type RegistrationResponseJSON } from "@simplewebauthn/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, assertSameOrigin, HttpError } from "@/lib/http";
import { passkeyConfig } from "@/lib/passkeys";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireRequestUser(request);
    const body = await request.json() as { response?: RegistrationResponseJSON; name?: string };
    if (!body.response) throw new HttpError(400, "Passkey response is missing");
    const store = await cookies();
    const challenge = store.get("uk_passkey_reg_challenge")?.value;
    const webauthnUserID = store.get("uk_passkey_reg_user")?.value;
    const accountID = store.get("uk_passkey_reg_account")?.value;
    if (!challenge || !webauthnUserID || !accountID) throw new HttpError(400, "Passkey setup expired. Start again.");
    if (accountID !== user.id) throw new HttpError(400, "Passkey setup belongs to a different signed-in account. Start again.");
    const { rpID, origin } = passkeyConfig(request);
    const verification = await verifyRegistrationResponse({ response: body.response, expectedChallenge: challenge, expectedOrigin: origin, expectedRPID: rpID });
    if (!verification.verified || !verification.registrationInfo) throw new HttpError(400, "Passkey could not be verified");
    const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
    const name = String(body.name || "Passkey").trim().slice(0, 80) || "Passkey";
    const inserted = await db.query(`INSERT INTO passkeys(id,user_id,webauthn_user_id,public_key,counter,device_type,backed_up,transports,name)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      ON CONFLICT (id) DO NOTHING`, [credential.id,user.id,webauthnUserID,Buffer.from(credential.publicKey),credential.counter,credentialDeviceType,credentialBackedUp,credential.transports ?? null,name]);
    if (!inserted.rowCount) throw new HttpError(409, "This passkey is already registered");
    store.set("uk_passkey_reg_challenge", "", { path: "/", maxAge: 0 });
    store.set("uk_passkey_reg_user", "", { path: "/", maxAge: 0 });
    store.set("uk_passkey_reg_account", "", { path: "/", maxAge: 0 });
    return NextResponse.json({ verified: true, data: { id: credential.id, name } });
  } catch (error) { return apiError(error); }
}
