import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { publicRoutes } from "./routes";

export const SESSION_LOCK_COOKIE_NAME = "banq_session_locked";

// /session-locked itself must stay reachable while locked (it's the unlock screen), and
// public routes (login etc.) don't need this check at all.
const EXEMPT_ROUTES = [...publicRoutes, "/session-locked"];

function isExempt(pathname: string) {
  return EXEMPT_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

// Prevents the "flash of real content" a purely client-side lock overlay can't avoid: on a
// reload or a fresh navigation typed into the address bar, Next.js would otherwise render
// and send the real page's full HTML before any client JS runs — by the time the client-side
// SessionLock component's effect fires, the browser has already painted the real page for a
// moment. Catching it here, before the page renders, means the real content is never sent.
//
// This rewrites (not redirects) — the URL in the browser's address bar is untouched, so the
// user stays on the exact page they were on, matching the "not a logout" requirement. They
// just see the lock screen instead of that page's content until the cookie is cleared.
export function sessionLockGuard(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;

  if (isExempt(pathname)) {
    return null;
  }

  const isLocked = request.cookies.get(SESSION_LOCK_COOKIE_NAME)?.value === "1";

  if (!isLocked) {
    return null;
  }

  return NextResponse.rewrite(new URL("/session-locked", request.url));
}
