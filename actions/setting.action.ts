"use server";

import { authApiClient } from "@/lib/api-client";

export async function getSettingsAction(category?: string) {
  const params = new URLSearchParams();
  if (category && category.trim()) {
    params.set("category", category.trim());
  }

  const query = params.toString();

  const result: any = await authApiClient({
    endpoint: `/admin/settings${query ? `?${query}` : ""}`,
    method: "GET",
  });

  return result;
}

export async function updateSettingAction(key: string, value: unknown) {
  const result: any = await authApiClient({
    endpoint: `/admin/settings/${key}`,
    method: "PUT",
    body: { value },
  });

  return result;
}

// For `type: "image"` settings (e.g. system.company.logo) — a file travels as
// multipart FormData, not the plain JSON body updateSettingAction sends.
export async function uploadSettingImageAction(
  key: string,
  formData: FormData,
) {
  const result: any = await authApiClient({
    endpoint: `/admin/settings/${key}/upload`,
    method: "POST",
    body: formData,
  });

  return result;
}

// Any authenticated user — the app shell (sidebar logo/company name) needs this on
// every page, not just admins with view_settings.
export async function getBrandingAction() {
  const result: any = await authApiClient({
    endpoint: "/admin/settings/branding",
    method: "GET",
  });

  return result;
}
