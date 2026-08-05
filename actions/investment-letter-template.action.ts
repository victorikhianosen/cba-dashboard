"use server";

import { authApiClient } from "@/lib/api-client";

export async function getInvestmentLetterTemplatesAction(page: number = 1) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/investment-letter-templates?page=${page}`,
      method: "GET",
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function getInvestmentLetterTemplateAction(id: number | string) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/investment-letter-templates/${id}`,
      method: "GET",
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

// Takes a FormData built on the client so the header/signature image files travel
// through the Server Action untouched — authApiClient sends it as multipart/form-data.
export async function createInvestmentLetterTemplateAction(formData: FormData) {
  try {
    const result: any = await authApiClient({
      endpoint: "/admin/investment-letter-templates",
      method: "POST",
      body: formData,
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function updateInvestmentLetterTemplateAction(id: number | string, formData: FormData) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/investment-letter-templates/${id}`,
      method: "PUT",
      body: formData,
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function deleteInvestmentLetterTemplateAction(id: number | string) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/investment-letter-templates/${id}`,
      method: "DELETE",
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function setDefaultInvestmentLetterTemplateAction(id: number | string) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/investment-letter-templates/${id}/set-default`,
      method: "POST",
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}
