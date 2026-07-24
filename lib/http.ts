import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
  }
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return;
  const configuredOrigin = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  const expected = configuredOrigin ? new URL(configuredOrigin).origin : new URL(request.url).origin;
  if (origin !== expected) throw new HttpError(403, "Cross-origin request rejected");
}

export function requestIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? request.headers.get("x-real-ip")
    ?? "0.0.0.0";
}

export function apiError(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message, details: error.details }, { status: error.status });
  }
  if (error instanceof ZodError) {
    const details = error.flatten();
    const first = error.issues[0];
    const field = first?.path?.length ? `${first.path.join(".")}: ` : "";
    return NextResponse.json({ error: first ? `${field}${first.message}` : "Please check the entered details", details }, { status: 400 });
  }
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = String((error as { code?: unknown }).code ?? "");
    if (code === "23505") return NextResponse.json({ error: "A record with that value already exists" }, { status: 409 });
    if (code === "23503") return NextResponse.json({ error: "This record is referenced by other data" }, { status: 409 });
    if (code === "23514" || code === "22P02") return NextResponse.json({ error: "The supplied data violates a database rule" }, { status: 400 });
  }
  console.error(error);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
