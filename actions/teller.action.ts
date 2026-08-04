"use server";

import { authApiClient } from "@/lib/api-client";

export async function getTellersAction(page: number = 1, perPage?: number) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/tellers?page=${page}${perPage ? `&per_page=${perPage}` : ""}`,
      method: "GET",
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function getTellerAction(id: number | string) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/tellers/${id}`,
      method: "GET",
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function createTellerAction(data: Record<string, any>) {
  try {
    const result: any = await authApiClient({
      endpoint: "/admin/tellers",
      method: "POST",
      body: data,
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function approveTellerAction(id: number | string) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/tellers/${id}/approve`,
      method: "POST",
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function updateTellerStatusAction(id: number | string, status: string) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/tellers/${id}/status`,
      method: "POST",
      body: { status },
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function assignTellerAction(id: number | string, userId: number | string) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/tellers/${id}/assign`,
      method: "POST",
      body: { user_id: userId },
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function unassignTellerAction(id: number | string) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/tellers/${id}/unassign`,
      method: "POST",
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}
