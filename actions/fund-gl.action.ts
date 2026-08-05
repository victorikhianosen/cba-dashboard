"use server";

import { authApiClient } from "@/lib/api-client";

export async function getFundGlsAction(
  page: number = 1,
  filters: {
    from?: string;
    to?: string;
    search?: string;
    status?: string;
    per_page?: number;
  } = {}
) {
  try {
    const params = new URLSearchParams({
      page: String(page),
      per_page: String(filters.per_page ?? 50),
    });

    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    if (filters.search) params.set("search", filters.search);
    if (filters.status) params.set("status", filters.status);

    const result: any = await authApiClient({
      endpoint: `/admin/fund-gls?${params.toString()}`,
      method: "GET",
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function getFundGlAction(id: number | string) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/fund-gls/${id}`,
      method: "GET",
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function createFundGlAction(data: Record<string, any>) {
  try {
    const result: any = await authApiClient({
      endpoint: "/admin/fund-gls",
      method: "POST",
      body: data,
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function reviewFundGlAction(id: number | string, totpCode: string) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/fund-gls/${id}/review`,
      method: "POST",
      body: { totp_code: totpCode },
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function approveFundGlAction(id: number | string, totpCode: string) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/fund-gls/${id}/approve`,
      method: "POST",
      body: { totp_code: totpCode },
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function rejectFundGlAction(id: number | string, reason: string, totpCode: string) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/fund-gls/${id}/reject`,
      method: "POST",
      body: { reason, totp_code: totpCode },
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}
