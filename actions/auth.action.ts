"use server";

import { authApiClient, clearToken, publicApiClient, saveOnboardingStatus, saveToken } from "@/lib/api-client";
import { cookies } from "next/headers";

export async function loginAction(data: any) {
  try {
    const result: any = await publicApiClient({
      endpoint: "/admin/auth/login",
      method: "POST",
      body: data,
    });

    const token = result?.data?.token ?? result?.token;

    if (token) {
      await saveToken(token);
    }

    return result;
  } catch {
    return { status: 'failed', responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function getCurrentUserAction() {
  try {
    const result: any = await authApiClient({
      endpoint: "/admin/auth/me",
      method: "GET",
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function logoutAction() {
  try {
    await authApiClient({
      endpoint: "/admin/auth/logout",
      method: "POST",
    });
  } catch {
    // ignore network/API errors — always clear the local session below
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
  } catch {
    // ignore network/API errors — always clear the local session below
  } finally {
    await clearToken();
  }

  return { status: "success" };
}

export async function verifyTwoFactorAction(data: { code: string; two_factor_token: string }) {
  try {
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
  } catch {
    return { status: 'failed', responseCode: "500", message: "An unexpected error occurred." };
  }
}



