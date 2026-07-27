"use server";

import { authApiClient } from "@/lib/api-client";

export async function getPermissionsAction(page: number = 1, search: string = "") {
  try {
    const params = new URLSearchParams({ page: String(page) });

    if (search.trim()) {
      params.set("search", search.trim());
    }

    const result: any = await authApiClient({
      endpoint: `/admin/permissions?${params.toString()}`,
      method: "GET",
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

// Fetches every permission across all pages, used to render the full
// permission checklist on the role detail page.
export async function getAllPermissionsAction() {
  try {
    const allPermissions: any[] = [];
    let page = 1;
    let lastPage = 1;

    do {
      const result: any = await authApiClient({
        endpoint: `/admin/permissions?page=${page}`,
        method: "GET",
      });

      if (result?.status !== "success") {
        return result;
      }

      allPermissions.push(...(Array.isArray(result.data) ? result.data : []));
      lastPage = result?.meta?.last_page ?? 1;
      page += 1;
    } while (page <= lastPage);

    // Pages can shift while paginating (a record created/edited between
    // fetches), so the same id may show up on two pages — dedupe it.
    const uniquePermissions = Array.from(
      new Map(allPermissions.map((item) => [item.id, item])).values()
    );

    return { status: "success", data: uniquePermissions };
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function getPermissionAction(id: number | string) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/permissions/${id}`,
      method: "GET",
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function createPermissionAction(data: { name: string }) {
  try {
    const result: any = await authApiClient({
      endpoint: "/admin/permissions",
      method: "POST",
      body: data,
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function updatePermissionAction(id: number | string, data: { name: string }) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/permissions/${id}`,
      method: "PUT",
      body: data,
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}
