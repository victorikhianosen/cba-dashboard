"use server";

import { authApiClient } from "@/lib/api-client";

export async function getAccountStatementTemplatesAction(page: number = 1) {
  const result: any = await authApiClient({
    endpoint: `/admin/account-statement-templates?page=${page}`,
    method: "GET",
  });

  return result;
}

export async function getAccountStatementTemplateAction(id: number | string) {
  const result: any = await authApiClient({
    endpoint: `/admin/account-statement-templates/${id}`,
    method: "GET",
  });

  return result;
}

// Takes a FormData built on the client so the header image file travels through the
// Server Action untouched — authApiClient sends it as multipart/form-data.
export async function createAccountStatementTemplateAction(formData: FormData) {
  const result: any = await authApiClient({
    endpoint: "/admin/account-statement-templates",
    method: "POST",
    body: formData,
  });

  return result;
}

export async function updateAccountStatementTemplateAction(
  id: number | string,
  formData: FormData,
) {
  const result: any = await authApiClient({
    endpoint: `/admin/account-statement-templates/${id}`,
    method: "PUT",
    body: formData,
  });

  return result;
}

export async function deleteAccountStatementTemplateAction(
  id: number | string,
) {
  const result: any = await authApiClient({
    endpoint: `/admin/account-statement-templates/${id}`,
    method: "DELETE",
  });

  return result;
}

export async function setDefaultAccountStatementTemplateAction(
  id: number | string,
) {
  const result: any = await authApiClient({
    endpoint: `/admin/account-statement-templates/${id}/set-default`,
    method: "POST",
  });

  return result;
}
