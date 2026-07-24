import { NextRequest, NextResponse } from "next/server";

const ngrokOriginPattern =
  /^https:\/\/[a-zA-Z0-9-]+\.ngrok-free\.app$/;

const localOriginPattern =
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

function isAllowedOrigin(origin: string): boolean {
  return (
    ngrokOriginPattern.test(origin) ||
    localOriginPattern.test(origin)
  );
}

export function proxy(request: NextRequest) {
  const origin = request.headers.get("origin") ?? "";
  const allowed = isAllowedOrigin(origin);

  const response =
    request.method === "OPTIONS"
      ? new NextResponse(null, { status: 204 })
      : NextResponse.next();

  if (allowed) {
    response.headers.set(
      "Access-Control-Allow-Origin",
      origin,
    );
    response.headers.set("Vary", "Origin");
    response.headers.set(
      "Access-Control-Allow-Credentials",
      "true",
    );
  }

  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  );

  response.headers.set(
    "Access-Control-Allow-Headers",
    [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "X-CSRF-Token",
    ].join(", "),
  );

  response.headers.set(
    "Access-Control-Max-Age",
    "86400",
  );

  return response;
}

export const config = {
  matcher: ["/api/:path*"],
};