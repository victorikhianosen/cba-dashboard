"use server";

import { authApiClient } from "@/lib/api-client";

export async function getPostingsAction(
  page: number = 1,
  filters: {
    from?: string;
    to?: string;
    search?: string;
    status?: string;
    type?: string;
  } = {}
) {
  try {
    const params = new URLSearchParams({ page: String(page), per_page: "50" });

    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    if (filters.search) params.set("search", filters.search);
    if (filters.status) params.set("status", filters.status);
    if (filters.type) params.set("type", filters.type);

    const result: any = await authApiClient({
      endpoint: `/admin/postings?${params.toString()}`,
      method: "GET",
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function getPostingAction(id: number | string) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/postings/${id}`,
      method: "GET",
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function createPostingAction(data: Record<string, any>) {
  try {
    const result: any = await authApiClient({
      endpoint: "/admin/postings",
      method: "POST",
      body: data,
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function approvePostingAction(id: number | string, totpCode: string) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/postings/${id}/approve`,
      method: "POST",
      body: { totp_code: totpCode },
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function bulkApprovePostingsAction(ids: Array<number | string>, totpCode: string) {
  try {
    const result: any = await authApiClient({
      endpoint: "/admin/postings/bulk-approve",
      method: "POST",
      body: { ids, totp_code: totpCode },
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

// Bulk-creates pending postings from an uploaded multi-sheet spreadsheet (Postings + GL
// Reference) — the template for it is downloaded via ExportDropdown's proxy pattern
// (/api/export?endpoint=...), not this action, since that's a file download rather than a
// JSON call.
export async function bulkImportPostingsAction(formData: FormData) {
  try {
    const result: any = await authApiClient({
      endpoint: "/admin/postings/bulk-import",
      method: "POST",
      body: formData,
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function rejectPostingAction(id: number | string, reason: string) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/postings/${id}/reject`,
      method: "POST",
      body: { reason },
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}
