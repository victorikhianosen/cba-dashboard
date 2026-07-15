import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  AUTH_COOKIE_NAME,
  defaultAuthenticatedRoute,
  defaultUnauthenticatedRoute,
  publicRoutes,
} from "./routes";

function isPublicRoute(pathname: string) {
  return publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

export function authGuard(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const { pathname } = request.nextUrl;

  const isLoggedIn = Boolean(token);
  const isPublic = isPublicRoute(pathname);

  // Guest trying to reach anything inside (protected)
  if (!isLoggedIn && !isPublic) {
    const redirectUrl = new URL(defaultUnauthenticatedRoute, request.url);
    redirectUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Logged-in user trying to see login / verify-2fa
  if (isLoggedIn && isPublic && pathname !== "/") {
    return NextResponse.redirect(new URL(defaultAuthenticatedRoute, request.url));
  }

  return NextResponse.next();
}
