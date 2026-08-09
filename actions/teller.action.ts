"use server";

import { authApiClient } from "@/lib/api-client";

export async function getTellersAction(page: number = 1, perPage?: number) {
  const result: any = await authApiClient({
    endpoint: `/admin/tellers?page=${page}${perPage ? `&per_page=${perPage}` : ""}`,
    method: "GET",
  });

  return result;
}

export async function getTellerAction(id: number | string) {
  const result: any = await authApiClient({
    endpoint: `/admin/tellers/${id}`,
    method: "GET",
  });

  return result;
}

export async function createTellerAction(data: Record<string, any>) {
  const result: any = await authApiClient({
    endpoint: "/admin/tellers",
    method: "POST",
    body: data,
  });

  return result;
}

export async function approveTellerAction(
  id: number | string,
  totpCode: string,
) {
  const result: any = await authApiClient({
    endpoint: `/admin/tellers/${id}/approve`,
    method: "POST",
    body: { totp_code: totpCode },
  });

  return result;
}

export async function updateTellerStatusAction(
  id: number | string,
  status: string,
) {
  const result: any = await authApiClient({
    endpoint: `/admin/tellers/${id}/status`,
    method: "POST",
    body: { status },
  });

  return result;
}

export async function assignTellerAction(
  id: number | string,
  userId: number | string,
) {
  const result: any = await authApiClient({
    endpoint: `/admin/tellers/${id}/assign`,
    method: "POST",
    body: { user_id: userId },
  });

  return result;
}

export async function unassignTellerAction(id: number | string) {
  const result: any = await authApiClient({
    endpoint: `/admin/tellers/${id}/unassign`,
    method: "POST",
  });

  return result;
}
