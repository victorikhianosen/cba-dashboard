"use server";

import { authApiClient } from "@/lib/api-client";

export async function getAccountStatementTemplatesAction(page: number = 1) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/account-statement-templates?page=${page}`,
      method: "GET",
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function getAccountStatementTemplateAction(id: number | string) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/account-statement-templates/${id}`,
      method: "GET",
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

// Takes a FormData built on the client so the header image file travels through the
// Server Action untouched — authApiClient sends it as multipart/form-data.
export async function createAccountStatementTemplateAction(formData: FormData) {
  try {
    const result: any = await authApiClient({
      endpoint: "/admin/account-statement-templates",
      method: "POST",
      body: formData,
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function updateAccountStatementTemplateAction(id: number | string, formData: FormData) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/account-statement-templates/${id}`,
      method: "PUT",
      body: formData,
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function deleteAccountStatementTemplateAction(id: number | string) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/account-statement-templates/${id}`,
      method: "DELETE",
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function setDefaultAccountStatementTemplateAction(id: number | string) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/account-statement-templates/${id}/set-default`,
      method: "POST",
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}
