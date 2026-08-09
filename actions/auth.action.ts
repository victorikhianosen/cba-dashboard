"use server";

import {
  authApiClient,
  clearToken,
  publicApiClient,
  saveOnboardingStatus,
  saveToken,
} from "@/lib/api-client";
import { SESSION_LOCK_COOKIE_NAME } from "@/guard/session-lock-guard";
import { cookies } from "next/headers";

export async function loginAction(data: any) {
  const result: any = await publicApiClient({
    endpoint: "/admin/auth/login",
    method: "POST",
    body: data,
  });

  // "token" covers a hypothetical bare-token shape; "access_token" is what the backend
  // actually returns here when security.authentication.google_auth_unlock is off and
  // login() skips straight to issuing a real token (same key verifyTwoFactorAction reads).
  const token =
    result?.data?.access_token ??
    result?.access_token ??
    result?.data?.token ??
    result?.token;

  if (token) {
    await saveToken(token);
  }

  return result;
}

export async function getCurrentUserAction() {
  const result: any = await authApiClient({
    endpoint: "/admin/auth/me",
    method: "GET",
  });

  return result;
}

export async function logoutAction() {
  try {
    await authApiClient({
      endpoint: "/admin/auth/logout",
      method: "POST",
    });
  } finally {
    await clearToken();
  }

  return { status: "success" };
}

// Called by SessionGuard's idle timer, distinct from logoutAction() so the backend
// records a "session_timeout" journey/audit entry instead of a manual logout.
export async function sessionTimeoutAction() {
  try {
    await authApiClient({
      endpoint: "/admin/auth/session-timeout",
      method: "POST",
    });
  } finally {
    await clearToken();
  }

  return { status: "success" };
}

// Whether the idle session-lock feature is turned on, and how long a user can
// be inactive before it kicks in. Any authenticated user can call this — it's
// used to decide whether SessionLock should attach its idle listeners at all.
export async function getSettingLockConfigAction() {
  const result: any = await authApiClient({
    endpoint: "/admin/session/lock-config",
    method: "GET",
  });

  return result;
}

// Called the moment the idle timer fires — records the lock server-side. The overlay is
// shown regardless of whether this call succeeds. Also sets a plain (non-httpOnly, so it's
// only ever a UX hint, never the actual security boundary — that's the backend's
// session.lock middleware) cookie proxy.ts's sessionLockGuard reads on every request:
// without it, a reload or a fresh navigation typed into the address bar would render the
// real page's full server HTML before any client JS gets a chance to check lock status and
// show the overlay — a visible flash of real content. The cookie lets the proxy rewrite to
// /session-locked at the server, before the page ever renders, instead of hiding it after.
export async function lockSessionAction() {
  const result: any = await authApiClient({
    endpoint: "/admin/session/lock",
    method: "POST",
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_LOCK_COOKIE_NAME, "1", {
    path: "/",
    sameSite: "lax",
  });

  return result;
}

// Verifies the 6-digit Google Authenticator code and unlocks the session.
// Returns a validation error on the `code` field when it's wrong.
export async function unlockSessionAction(code: string) {
  const result: any = await authApiClient({
    endpoint: "/admin/session/unlock",
    method: "POST",
    body: { code },
  });

  if (result?.status === "success") {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_LOCK_COOKIE_NAME);
  }

  return result;
}

export async function verifyTwoFactorAction(data: {
  code: string;
  two_factor_token: string;
}) {
  const result: any = await publicApiClient({
    endpoint: "/admin/auth/2fa/verify",
    method: "POST",
    body: data,
  });

  const token = result?.data?.access_token ?? result?.access_token;

  if (token) {
    await saveToken(token);
  }

  return result;
}
