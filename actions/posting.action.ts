"use server";

import { authApiClient } from "@/lib/api-client";

export async function getPostingsAction(page: number = 1) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/postings?page=${page}&per_page=50`,
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

export async function approvePostingAction(id: number | string) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/postings/${id}/approve`,
      method: "POST",
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function bulkApprovePostingsAction(ids: Array<number | string>) {
  try {
    const result: any = await authApiClient({
      endpoint: "/admin/postings/bulk-approve",
      method: "POST",
      body: { ids },
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
