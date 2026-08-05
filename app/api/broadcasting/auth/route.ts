import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

// Echo's private-channel auth handshake needs a Bearer token, but the API
// token lives in an httpOnly cookie (set in lib/api-client.ts) that client
// JS can never read. This route runs server-side (can read the httpOnly
// cookie) and just forwards the handshake to Laravel's own
// /broadcasting/auth with the Authorization header attached — Echo is
// configured (lib/echo.ts) to POST here instead of hitting the API directly.
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("banq_token")?.value;

  if (!token) {
    return NextResponse.json({ message: "Unauthenticated." }, { status: 401 });
  }

  const body = await request.text();
  const contentType = request.headers.get("content-type") ?? "application/x-www-form-urlencoded";

  const response = await fetch(`${process.env.API_BASE_URL}/broadcasting/auth`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": contentType,
      Authorization: `Bearer ${token}`,
    },
    body,
  });

  const text = await response.text();

  return new NextResponse(text, {
    status: response.status,
    headers: { "Content-Type": response.headers.get("content-type") ?? "application/json" },
  });
}
