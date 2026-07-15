import type { NextRequest } from "next/server";
import { authGuard } from "./guard/auth-guard";

export function proxy(request: NextRequest) {
  return authGuard(request);
}

export const config = {
  // Exclude API routes, Next internals, and any public static file (has a file extension)
  matcher: ["/((?!api|_next/static|_next/image|.*\\..*).*)"],
};
