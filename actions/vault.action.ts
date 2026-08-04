"use server";

import { authApiClient } from "@/lib/api-client";

export async function getVaultsAction(page: number = 1) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/vaults?page=${page}`,
      method: "GET",
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function getAllVaultsAction() {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/vaults?per_page=200`,
      method: "GET",
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function getVaultAction(id: number | string) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/vaults/${id}`,
      method: "GET",
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function createVaultAction(data: Record<string, any>) {
  try {
    const result: any = await authApiClient({
      endpoint: "/admin/vaults",
      method: "POST",
      body: data,
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function approveVaultAction(id: number | string) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/vaults/${id}/approve`,
      method: "POST",
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function updateVaultStatusAction(id: number | string, status: string) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/vaults/${id}/status`,
      method: "POST",
      body: { status },
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}
