"use server";

import { authApiClient } from "@/lib/api-client";

export async function getLoansAction(
  page: number = 1,
  search: string = "",
  status: string = "",
) {
  const params = new URLSearchParams({ page: String(page) });

  if (search.trim()) {
    params.set("search", search.trim());
  }

  if (status.trim()) {
    params.set("status", status.trim());
  }

  const result: any = await authApiClient({
    endpoint: `/admin/loans?${params.toString()}`,
    method: "GET",
  });

  return result;
}

export async function getLoanAction(id: number | string) {
  const result: any = await authApiClient({
    endpoint: `/admin/loans/${id}`,
    method: "GET",
  });

  return result;
}

// Books a new loan — the customer is resolved on the backend from the
// disbursement account itself, so there's no separate customer-search step here.
export async function createLoanAction(data: Record<string, any>) {
  const result: any = await authApiClient({
    endpoint: `/admin/loans`,
    method: "POST",
    body: data,
  });

  return result;
}

// Pure preview — computes the amortization schedule for a product/principal/repayments
// combination that hasn't been booked yet. Nothing is created.
export async function previewLoanScheduleAction(data: Record<string, any>) {
  const result: any = await authApiClient({
    endpoint: `/admin/loans/preview-schedule`,
    method: "POST",
    body: data,
  });

  return result;
}

export async function getLoanScheduleAction(id: number | string) {
  const result: any = await authApiClient({
    endpoint: `/admin/loans/${id}/schedule`,
    method: "GET",
  });

  return result;
}

export async function getLoanTransactionsAction(
  id: number | string,
  page: number = 1,
) {
  const result: any = await authApiClient({
    endpoint: `/admin/loans/${id}/transactions?page=${page}`,
    method: "GET",
  });

  return result;
}

// Approving IS the authorization to disburse — TOTP-gated, no separate posting-approval
// step.
export async function approveLoanAction(
  id: number | string,
  totpCode: string,
) {
  const result: any = await authApiClient({
    endpoint: `/admin/loans/${id}/approve`,
    method: "POST",
    body: { totp_code: totpCode },
  });

  return result;
}

export async function rejectLoanAction(id: number | string, reason: string) {
  const result: any = await authApiClient({
    endpoint: `/admin/loans/${id}/reject`,
    method: "POST",
    body: { reason },
  });

  return result;
}

// Read-only, side-effect-free — shows how a hypothetical repayment would be split across
// installments/buckets (penalty -> fee -> interest -> principal waterfall) before anyone
// commits to actually repaying.
export async function previewLoanRepaymentAction(
  id: number | string,
  amount: string,
) {
  const result: any = await authApiClient({
    endpoint: `/admin/loans/${id}/repayment/preview`,
    method: "POST",
    body: { amount },
  });

  return result;
}

// TOTP-gated — the actual money-moving repayment.
export async function repayLoanAction(
  id: number | string,
  data: { amount: string | number; funding_account_id: string | number; description?: string },
  totpCode: string,
) {
  const result: any = await authApiClient({
    endpoint: `/admin/loans/${id}/repay`,
    method: "POST",
    body: { ...data, totp_code: totpCode },
  });

  return result;
}
