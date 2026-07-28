import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const baseURL = process.env.NEXT_PUBLIC_BASE_URL;

// Proxies CSV/PDF export downloads to the backend. Browsers can't attach the
// httpOnly auth cookie's token as a Bearer header themselves, so this route
// runs server-side (where the cookie is readable), forwards the request with
// the Authorization header, and streams the file straight back.
export async function GET(request: NextRequest) {
  const endpoint = request.nextUrl.searchParams.get("endpoint");

  if (!endpoint || !endpoint.startsWith("/admin/")) {
    return NextResponse.json({ status: "failed", message: "Invalid export endpoint." }, { status: 400 });
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("banq_token")?.value;

  const upstream = await fetch(`${baseURL}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "*/*",
    },
  });

  if (!upstream.ok) {
    const body = await upstream.text();
    return new NextResponse(body, {
      status: upstream.status,
      headers: { "Content-Type": upstream.headers.get("Content-Type") ?? "application/json" },
    });
  }

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") ?? "application/octet-stream",
      "Content-Disposition": upstream.headers.get("Content-Disposition") ?? "attachment",
    },
  });
}
