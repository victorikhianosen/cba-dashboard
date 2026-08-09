"use server";

import { authApiClient } from "@/lib/api-client";

export async function getVaultsAction(page: number = 1) {
  const result: any = await authApiClient({
    endpoint: `/admin/vaults?page=${page}`,
    method: "GET",
  });

  return result;
}

export async function getAllVaultsAction() {
  const result: any = await authApiClient({
    endpoint: `/admin/vaults?per_page=200`,
    method: "GET",
  });

  return result;
}

export async function getVaultAction(id: number | string) {
  const result: any = await authApiClient({
    endpoint: `/admin/vaults/${id}`,
    method: "GET",
  });

  return result;
}

export async function createVaultAction(data: Record<string, any>) {
  const result: any = await authApiClient({
    endpoint: "/admin/vaults",
    method: "POST",
    body: data,
  });

  return result;
}

export async function approveVaultAction(
  id: number | string,
  totpCode: string,
) {
  const result: any = await authApiClient({
    endpoint: `/admin/vaults/${id}/approve`,
    method: "POST",
    body: { totp_code: totpCode },
  });

  return result;
}

export async function updateVaultStatusAction(
  id: number | string,
  status: string,
) {
  const result: any = await authApiClient({
    endpoint: `/admin/vaults/${id}/status`,
    method: "POST",
    body: { status },
  });

  return result;
}
