import "server-only";

export function passkeyConfig(request: Request) {
  const configured = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  const base = new URL(configured || request.url);
  return {
    rpName: process.env.PASSKEY_RP_NAME || "UK Store",
    rpID: process.env.PASSKEY_RP_ID || base.hostname,
    origin: process.env.PASSKEY_ORIGIN || base.origin,
  };
}
