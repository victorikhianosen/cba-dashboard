"use server";

import { authApiClient } from "@/lib/api-client";

export async function getInvestmentsAction(page: number = 1, search: string = "", status: string = "") {
  try {
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
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

// Account-number-first booking — the customer is resolved on the backend from the funding
// account itself, so there's no separate customer-search step here.
export async function createInvestmentAction(data: Record<string, any>) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/investments`,
      method: "POST",
      body: data,
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

// Computes the projected interest schedule for a product/principal/tenure/posting-period
// combination that hasn't been booked yet — nothing is created, purely a preview.
export async function previewInvestmentScheduleAction(data: Record<string, any>) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/investments/preview-schedule`,
      method: "POST",
      body: data,
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function getInvestmentAction(id: number | string) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/investments/${id}`,
      method: "GET",
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

// Shows the schedule that will actually be generated once this pending investment is
// approved — sourced from the investment's own locked-in terms, not a re-entered amount.
export async function previewInvestmentApprovalAction(id: number | string) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/investments/${id}/approval-preview`,
      method: "GET",
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function approveInvestmentAction(id: number | string, totpCode: string) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/investments/${id}/approve`,
      method: "POST",
      body: { totp_code: totpCode },
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function rejectInvestmentAction(id: number | string) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/investments/${id}/reject`,
      method: "POST",
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

// Read-only — shows the current schedule alongside the projected post-top-up schedule
// before anyone commits to requesting it. Nothing is created by this call.
export async function previewTopUpAction(id: number | string, amount: string) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/investments/${id}/topup/preview`,
      method: "POST",
      body: { amount },
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

// Stages a top-up — no money moves yet. The investment stays 'active' the whole time;
// pending_topup_amount is what marks it as awaiting approval.
export async function requestTopUpAction(id: number | string, amount: string) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/investments/${id}/topup`,
      method: "POST",
      body: { amount },
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

// For the approve flow — the amount is already fixed (pending_topup_amount), so a checker
// can see exactly what they're about to apply (current vs. projected schedule) before
// confirming, without re-entering the amount.
export async function previewPendingTopUpAction(id: number | string) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/investments/${id}/topup/pending-preview`,
      method: "GET",
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

// Approving IS the authorization to move the money (same single-step model as investment
// approval) — no separate Postings-screen detour.
export async function approveTopUpAction(id: number | string, totpCode: string) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/investments/${id}/topup/approve`,
      method: "POST",
      body: { totp_code: totpCode },
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function rejectTopUpAction(id: number | string, reason: string) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/investments/${id}/topup/reject`,
      method: "POST",
      body: { reason },
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

// Only an active investment can be terminated. Returns the full current principal to the
// customer, minus an early-liquidation penalty if the product has one configured.
export async function terminateInvestmentAction(id: number | string, reason: string) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/investments/${id}/terminate`,
      method: "POST",
      body: { reason },
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

// Emails the same letter that {id}/letter would download, to the customer's address on
// file. Printing the letter itself is a plain authenticated download, not a Server Action
// — see the "Print Letter" link in InvestmentDetail.tsx, which routes through
// /api/export (the generic authenticated-download proxy) instead.
export async function emailInvestmentLetterAction(id: number | string) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/investments/${id}/letter/email`,
      method: "POST",
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}
