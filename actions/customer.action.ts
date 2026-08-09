"use server";

import { authApiClient } from "@/lib/api-client";

export async function getCustomersAction(
  page: number = 1,
  search: string = "",
  status: string = "",
  customerType: string = "",
) {
  const params = new URLSearchParams({ page: String(page), per_page: "20" });

  if (search.trim()) params.set("search", search.trim());
  if (status.trim()) params.set("status", status.trim());
  if (customerType.trim()) params.set("customer_type", customerType.trim());

  const result: any = await authApiClient({
    endpoint: `/admin/customers?${params.toString()}`,
    method: "GET",
  });

  return result;
}

export async function getCustomerAction(id: number | string) {
  const result: any = await authApiClient({
    endpoint: `/admin/customers/${id}`,
    method: "GET",
  });

  return result;
}

// Resolves a customer's id/name from their CIF number — used to confirm a
// guardian (or any other customer reference) before submitting a form.
export async function lookupCustomerByCifAction(cifNumber: string) {
  const result: any = await authApiClient({
    endpoint: `/admin/customers/lookup?cif_number=${encodeURIComponent(cifNumber)}`,
    method: "GET",
  });

  return result;
}

// Resolves a customer's personal details from their BVN — used to prefill the
// Personal Information section during onboarding.
export async function lookupBvnAction(bvn: string) {
  const result: any = await authApiClient({
    endpoint: `/admin/bvn/lookup?bvn=${encodeURIComponent(bvn)}`,
    method: "GET",
  });

  return result;
}

// Takes a FormData built on the client so uploaded files (profile picture,
// utility bill, director/signatory photos and signatures) travel through the
// Server Action untouched — authApiClient sends it as multipart/form-data.
export async function createCustomerAction(formData: FormData) {
  const result: any = await authApiClient({
    endpoint: "/admin/customers",
    method: "POST",
    body: formData,
  });

  return result;
}

// Bulk-creates individual customers from an uploaded spreadsheet — the template for it is
// downloaded via ExportDropdown's proxy pattern (/api/export?endpoint=...), not this action,
// since that's a file download rather than a JSON call.
export async function bulkImportCustomersAction(formData: FormData) {
  const result: any = await authApiClient({
    endpoint: "/admin/customers/bulk-import",
    method: "POST",
    body: formData,
  });

  return result;
}

// Each file in the FormData becomes its own document — the field name it's sent
// under becomes that document's title/type on the API (arbitrary custom labels).
export async function uploadCustomerDocumentsAction(
  id: number | string,
  formData: FormData,
) {
  const result: any = await authApiClient({
    endpoint: `/admin/customers/${id}/documents`,
    method: "POST",
    body: formData,
  });

  return result;
}

// Approves, rejects or otherwise updates a single document (status: pending,
// verified, approved, rejected).
export async function updateCustomerDocumentAction(
  customerId: number | string,
  documentId: number | string,
  payload: {
    status?: string;
    title?: string;
    type?: string;
    comments?: string;
  },
) {
  const result: any = await authApiClient({
    endpoint: `/admin/customers/${customerId}/documents/${documentId}`,
    method: "PUT",
    body: payload,
  });

  return result;
}

// Generic status change to anything in the statuses lookup table (dormant, frozen,
// suspended, kyc_verified, blacklisted, etc.), with an optional comment.
export async function updateCustomerStatusAction(
  id: number | string,
  status: string,
  comment?: string,
) {
  const result: any = await authApiClient({
    endpoint: `/admin/customers/${id}/status`,
    method: "POST",
    body: { status, comment },
  });

  return result;
}

// FormData travels as multipart/form-data with a `_method=PUT` override
// (see api-client.ts) so uploaded files can be replaced on edit too.
export async function updateCustomerAction(
  id: number | string,
  formData: FormData,
) {
  const result: any = await authApiClient({
    endpoint: `/admin/customers/${id}`,
    method: "PUT",
    body: formData,
  });

  return result;
}

// account_product_id/account_tier_id assign the account opened for the
// customer on approval; the backend rejects the request without both.
export async function approveCustomerAction(
  id: number | string,
  payload: {
    account_product_id: number | string;
    account_tier_id: number | string;
  },
) {
  const result: any = await authApiClient({
    endpoint: `/admin/customers/${id}/approve`,
    method: "POST",
    body: payload,
  });

  return result;
}

// Opens an additional account for an existing (active) customer.
export async function openCustomerAccountAction(
  id: number | string,
  payload: {
    account_product_id: number | string;
    account_type: string;
    account_tier_id?: number | string;
  },
) {
  const result: any = await authApiClient({
    endpoint: `/admin/customers/${id}/accounts`,
    method: "POST",
    body: payload,
  });

  return result;
}

export async function rejectCustomerAction(
  id: number | string,
  reason: string,
) {
  const result: any = await authApiClient({
    endpoint: `/admin/customers/${id}/reject`,
    method: "POST",
    body: { reason },
  });

  return result;
}

export async function closeCustomerAction(id: number | string, reason: string) {
  const result: any = await authApiClient({
    endpoint: `/admin/customers/${id}/close`,
    method: "POST",
    body: { reason },
  });

  return result;
}

export async function resetCustomerPasswordAction(id: number | string) {
  return await authApiClient({
    endpoint: `/admin/customers/${id}/reset-password`,
    method: "POST",
  });
}

export async function resetCustomerPinAction(id: number | string) {
  return await authApiClient({
    endpoint: `/admin/customers/${id}/reset-pin`,
    method: "POST",
  });
}

export async function toggleInternetBankingAction(id: number | string) {
  return await authApiClient({
    endpoint: `/admin/customers/${id}/toggle-internet-banking`,
    method: "POST",
  });
}

export async function toggleSmsAction(id: number | string) {
  return await authApiClient({
    endpoint: `/admin/customers/${id}/toggle-sms`,
    method: "POST",
  });
}

export async function toggleEmailAction(id: number | string) {
  return await authApiClient({
    endpoint: `/admin/customers/${id}/toggle-email`,
    method: "POST",
  });
}
