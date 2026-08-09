"use server";

import { authApiClient } from "@/lib/api-client";

export async function getInvestmentsAction(
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
    endpoint: `/admin/investments?${params.toString()}`,
    method: "GET",
  });

  return result;
}

// Account-number-first booking — the customer is resolved on the backend from the funding
// account itself, so there's no separate customer-search step here.
export async function createInvestmentAction(data: Record<string, any>) {
  const result: any = await authApiClient({
    endpoint: `/admin/investments`,
    method: "POST",
    body: data,
  });

  return result;
}

// Computes the projected interest schedule for a product/principal/tenure/posting-period
// combination that hasn't been booked yet — nothing is created, purely a preview.
export async function previewInvestmentScheduleAction(
  data: Record<string, any>,
) {
  const result: any = await authApiClient({
    endpoint: `/admin/investments/preview-schedule`,
    method: "POST",
    body: data,
  });

  return result;
}

export async function getInvestmentAction(id: number | string) {
  const result: any = await authApiClient({
    endpoint: `/admin/investments/${id}`,
    method: "GET",
  });

  return result;
}

// Shows the schedule that will actually be generated once this pending investment is
// approved — sourced from the investment's own locked-in terms, not a re-entered amount.
export async function previewInvestmentApprovalAction(id: number | string) {
  const result: any = await authApiClient({
    endpoint: `/admin/investments/${id}/approval-preview`,
    method: "GET",
  });

  return result;
}

export async function approveInvestmentAction(
  id: number | string,
  totpCode: string,
) {
  const result: any = await authApiClient({
    endpoint: `/admin/investments/${id}/approve`,
    method: "POST",
    body: { totp_code: totpCode },
  });

  return result;
}

export async function rejectInvestmentAction(id: number | string) {
  const result: any = await authApiClient({
    endpoint: `/admin/investments/${id}/reject`,
    method: "POST",
  });

  return result;
}

// Read-only — shows the current schedule alongside the projected post-top-up schedule
// before anyone commits to requesting it. Nothing is created by this call.
export async function previewTopUpAction(id: number | string, amount: string) {
  const result: any = await authApiClient({
    endpoint: `/admin/investments/${id}/topup/preview`,
    method: "POST",
    body: { amount },
  });

  return result;
}

// Stages a top-up — no money moves yet. The investment stays 'active' the whole time;
// pending_topup_amount is what marks it as awaiting approval.
export async function requestTopUpAction(id: number | string, amount: string) {
  const result: any = await authApiClient({
    endpoint: `/admin/investments/${id}/topup`,
    method: "POST",
    body: { amount },
  });

  return result;
}

// For the approve flow — the amount is already fixed (pending_topup_amount), so a checker
// can see exactly what they're about to apply (current vs. projected schedule) before
// confirming, without re-entering the amount.
export async function previewPendingTopUpAction(id: number | string) {
  const result: any = await authApiClient({
    endpoint: `/admin/investments/${id}/topup/pending-preview`,
    method: "GET",
  });

  return result;
}

// Approving IS the authorization to move the money (same single-step model as investment
// approval) — no separate Postings-screen detour.
export async function approveTopUpAction(
  id: number | string,
  totpCode: string,
) {
  const result: any = await authApiClient({
    endpoint: `/admin/investments/${id}/topup/approve`,
    method: "POST",
    body: { totp_code: totpCode },
  });

  return result;
}

export async function rejectTopUpAction(id: number | string, reason: string) {
  const result: any = await authApiClient({
    endpoint: `/admin/investments/${id}/topup/reject`,
    method: "POST",
    body: { reason },
  });

  return result;
}

// Only an active investment can be terminated. Returns the full current principal to the
// customer, minus an early-liquidation penalty if the product has one configured.
export async function terminateInvestmentAction(
  id: number | string,
  reason: string,
) {
  const result: any = await authApiClient({
    endpoint: `/admin/investments/${id}/terminate`,
    method: "POST",
    body: { reason },
  });

  return result;
}

// Emails the same letter that {id}/letter would download, to the customer's address on
// file. Printing the letter itself is a plain authenticated download, not a Server Action
// — see the "Print Letter" link in InvestmentDetail.tsx, which routes through
// /api/export (the generic authenticated-download proxy) instead.
export async function emailInvestmentLetterAction(id: number | string) {
  const result: any = await authApiClient({
    endpoint: `/admin/investments/${id}/letter/email`,
    method: "POST",
  });

  return result;
}

// Read-only, side-effect-free — lets the maker see current-vs-projected schedule for a
// not-yet-submitted amount before they request it. Mirrors previewPartialLiquidationScheduleAction
// but takes a raw investment id + amount instead of an already-created liquidation id.
export async function previewPartialLiquidationForInvestmentAction(
  investmentId: number | string,
  amount: string,
) {
  const result: any = await authApiClient({
    endpoint: `/admin/investments/${investmentId}/partial-liquidation/preview?amount=${encodeURIComponent(
      amount,
    )}`,
    method: "GET",
  });

  return result;
}

// Stages a partial liquidation request — no money moves yet. A different admin must
// approve it (with TOTP) before the payout is made and current_principal decremented.
export async function requestPartialLiquidationAction(
  id: number | string,
  amount: string,
  reason: string,
) {
  const result: any = await authApiClient({
    endpoint: `/admin/investments/${id}/partial-liquidation`,
    method: "POST",
    body: { amount, reason },
  });

  return result;
}

export async function listPartialLiquidationsAction(
  page: number = 1,
  filters: {
    from?: string;
    to?: string;
    search?: string;
    status?: string;
  } = {},
) {
  const params = new URLSearchParams({ page: String(page) });

  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.search) params.set("search", filters.search);
  if (filters.status) params.set("status", filters.status);

  const result: any = await authApiClient({
    endpoint: `/admin/investment-partial-liquidations?${params.toString()}`,
    method: "GET",
  });

  return result;
}

export async function getPartialLiquidationAction(id: number | string) {
  const result: any = await authApiClient({
    endpoint: `/admin/investment-partial-liquidations/${id}`,
    method: "GET",
  });

  return result;
}

// Read-only, side-effect-free — safe to call repeatedly as the approver reviews. Shows the
// current schedule alongside the projected schedule that would be generated (via
// InvestmentScheduleService::regenerateRemaining()) if this pending liquidation is approved.
export async function previewPartialLiquidationScheduleAction(
  id: number | string,
) {
  const result: any = await authApiClient({
    endpoint: `/admin/investment-partial-liquidations/${id}/preview-schedule`,
    method: "GET",
  });

  return result;
}

// Approving IS the authorization to move the money — TOTP-gated, same single-step model
// as top-up approval.
export async function approvePartialLiquidationAction(
  id: number | string,
  totpCode: string,
) {
  const result: any = await authApiClient({
    endpoint: `/admin/investment-partial-liquidations/${id}/approve`,
    method: "POST",
    body: { totp_code: totpCode },
  });

  return result;
}

export async function rejectPartialLiquidationAction(
  id: number | string,
  reason: string,
) {
  const result: any = await authApiClient({
    endpoint: `/admin/investment-partial-liquidations/${id}/reject`,
    method: "POST",
    body: { reason },
  });

  return result;
}
