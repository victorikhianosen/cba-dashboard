"use server";

import { authApiClient } from "@/lib/api-client";

export async function getAccountsAction(page: number = 1, search: string = "") {
  try {
    const params = new URLSearchParams({ page: String(page), per_page: "50" });

    if (search.trim()) {
      params.set("search", search.trim());
    }

    const result: any = await authApiClient({
      endpoint: `/admin/accounts?${params.toString()}`,
      method: "GET",
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

// Resolves an account by its exact account number — used by flows (like opening an
// investment) that need the account name/balance/currency and owning customer without a
// separate customer-search step.
export async function lookupAccountByNumberAction(accountNumber: string) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/accounts/lookup?account_number=${encodeURIComponent(accountNumber)}`,
      method: "GET",
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function getAccountAction(id: number | string) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/accounts/${id}`,
      method: "GET",
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}


export async function updateAccountStatusAction(id: number | string, status: string) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/accounts/${id}/status`,
      method: "POST",
      body: { status },
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function placeLienAction(id: number | string, amount: string, reason?: string) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/accounts/${id}/lien`,
      method: "POST",
      body: { amount, reason },
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function toggleAccountPndAction(id: number | string) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/accounts/${id}/toggle-pnd`,
      method: "POST",
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function toggleAccountPncAction(id: number | string) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/accounts/${id}/toggle-pnc`,
      method: "POST",
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function emailAccountStatementAction(
  id: number | string,
  params: { from?: string; to?: string } = {}
) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/accounts/${id}/statement/email`,
      method: "POST",
      body: params,
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}
