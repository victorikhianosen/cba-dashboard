"use server";

import { authApiClient } from "@/lib/api-client";

export async function getVirtualAccountsAction(
  page: number = 1,
  filters: { search?: string; customer_id?: number | string; parent_account_id?: number | string } = {},
) {
  const params = new URLSearchParams({ page: String(page), per_page: "20" });
  if (filters.search) params.set("search", filters.search);
  if (filters.customer_id) params.set("customer_id", String(filters.customer_id));
  if (filters.parent_account_id) params.set("parent_account_id", String(filters.parent_account_id));

  const result: any = await authApiClient({
    endpoint: `/admin/virtual-accounts?${params.toString()}`,
    method: "GET",
  });

  return result;
}

export async function getVirtualAccountAction(id: number | string) {
  const result: any = await authApiClient({
    endpoint: `/admin/virtual-accounts/${id}`,
    method: "GET",
  });

  return result;
}

export async function getCustomerVirtualAccountsAction(
  customerId: number | string,
  perPage: number = 20,
) {
  const result: any = await authApiClient({
    endpoint: `/admin/customers/${customerId}/virtual-accounts?per_page=${perPage}`,
    method: "GET",
  });

  return result;
}

export async function createVirtualAccountAction(
  customerId: number | string,
  payload: {
    account_product_id: number | string;
    parent_account_id: number | string;
    beneficiary_name: string;
    purpose?: string;
    expires_at?: string;
  },
) {
  const result: any = await authApiClient({
    endpoint: `/admin/customers/${customerId}/virtual-accounts`,
    method: "POST",
    body: payload,
  });

  return result;
}

export async function updateVirtualAccountBeneficiaryAction(
  id: number | string,
  beneficiaryName: string,
) {
  const result: any = await authApiClient({
    endpoint: `/admin/virtual-accounts/${id}/beneficiary`,
    method: "PUT",
    body: { beneficiary_name: beneficiaryName },
  });

  return result;
}

export async function updateVirtualAccountStatusAction(
  id: number | string,
  status: string,
) {
  const result: any = await authApiClient({
    endpoint: `/admin/virtual-accounts/${id}/status`,
    method: "POST",
    body: { status },
  });

  return result;
}

export async function simulateVirtualAccountCreditAction(
  id: number | string,
  payload: { amount: number; narration?: string; provider_reference?: string },
) {
  const result: any = await authApiClient({
    endpoint: `/admin/virtual-accounts/${id}/simulate-credit`,
    method: "POST",
    body: payload,
  });

  return result;
}
