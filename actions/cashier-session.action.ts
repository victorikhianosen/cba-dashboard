"use server";

import { authApiClient } from "@/lib/api-client";

export async function getCashierSessionsAction(page: number = 1, status?: string, tellerId?: number | string) {
  try {
    const params = new URLSearchParams({ page: String(page) });
    if (status) params.set("status", status);
    if (tellerId) params.set("teller_id", String(tellerId));

    const result: any = await authApiClient({
      endpoint: `/admin/cashier-sessions?${params.toString()}`,
      method: "GET",
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function getCashierSessionAction(id: number | string) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/cashier-sessions/${id}`,
      method: "GET",
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function getMyCashierSessionAction() {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/cashier-sessions/mine`,
      method: "GET",
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function openCashierSessionAction(tellerId: number | string, openingFloatAmount: string) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/cashier-sessions/open`,
      method: "POST",
      body: { teller_id: tellerId, opening_float_amount: openingFloatAmount },
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function buyTellerCashAction(
  sessionId: number | string,
  counterpartyType: string,
  counterpartyId: number | string,
  amount: string,
  narration?: string
) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/cashier-sessions/${sessionId}/buy`,
      method: "POST",
      body: { counterparty_type: counterpartyType, counterparty_id: counterpartyId, amount, narration },
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function sellTellerCashAction(
  sessionId: number | string,
  counterpartyType: string,
  counterpartyId: number | string,
  amount: string,
  narration?: string
) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/cashier-sessions/${sessionId}/sell`,
      method: "POST",
      body: { counterparty_type: counterpartyType, counterparty_id: counterpartyId, amount, narration },
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function depositForCustomerAction(
  sessionId: number | string,
  accountNumber: string,
  amount: string,
  narration?: string
) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/cashier-sessions/${sessionId}/deposit`,
      method: "POST",
      body: { account_number: accountNumber, amount, narration },
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

// Creates a PENDING withdrawal request — no cash moves until a second admin approves it
// via approveWithdrawalAction().
export async function requestWithdrawalAction(
  sessionId: number | string,
  accountNumber: string,
  amount: string,
  narration?: string
) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/cashier-sessions/${sessionId}/withdraw`,
      method: "POST",
      body: { account_number: accountNumber, amount, narration },
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function getPendingWithdrawalsAction(page: number = 1, status: string = "all") {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/cashier-sessions/withdrawals/pending?page=${page}&status=${encodeURIComponent(status)}`,
      method: "GET",
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function approveWithdrawalAction(transactionId: number | string, totpCode: string) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/cashier-sessions/withdrawals/${transactionId}/approve`,
      method: "POST",
      body: { totp_code: totpCode },
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function rejectWithdrawalAction(transactionId: number | string, reason: string) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/cashier-sessions/withdrawals/${transactionId}/reject`,
      method: "POST",
      body: { reason },
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function closeCashierSessionAction(sessionId: number | string, countedClosingAmount: string) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/cashier-sessions/${sessionId}/close`,
      method: "POST",
      body: { counted_closing_amount: countedClosingAmount },
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function reconcileCashierSessionAction(sessionId: number | string) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/cashier-sessions/${sessionId}/reconcile`,
      method: "POST",
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function approveCashierVarianceAction(
  sessionId: number | string,
  totpCode: string,
  remarks?: string
) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/cashier-sessions/${sessionId}/approve-variance`,
      method: "POST",
      body: { remarks, totp_code: totpCode },
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function rejectCashierVarianceAction(sessionId: number | string, reason: string) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/cashier-sessions/${sessionId}/reject-variance`,
      method: "POST",
      body: { reason },
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}
