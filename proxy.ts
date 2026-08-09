import type { NextRequest } from "next/server";
import { authGuard } from "./guard/auth-guard";
import { sessionLockGuard } from "./guard/session-lock-guard";

export function proxy(request: NextRequest) {
  const authResponse = authGuard(request);

  // authGuard already issuing a redirect (e.g. bouncing a guest to /login) takes priority —
  // no point checking the lock cookie on a request that's not even going to reach a
  // protected page.
  if (authResponse.headers.get("location")) {
    return authResponse;
  }

  return sessionLockGuard(request) ?? authResponse;
}

export const config = {
  // Exclude API routes, Next internals, and any public static file (has a file extension)
  matcher: ["/((?!api|_next/static|_next/image|.*\\..*).*)"],
};
