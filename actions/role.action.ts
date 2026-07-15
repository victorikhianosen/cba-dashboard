"use server";

import { authApiClient } from "@/lib/api-client";

export async function getRolesAction(page: number = 1, search: string = "") {
  try {
    const params = new URLSearchParams({ page: String(page) });

    if (search.trim()) {
      params.set("search", search.trim());
    }

    const result: any = await authApiClient({
      endpoint: `/admin/roles?${params.toString()}`,
      method: "GET",
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

// Fetches every role across all pages, used to render the full role
// checklist on the user detail page.
export async function getAllRolesAction() {
  try {
    const allRoles: any[] = [];
    let page = 1;
    let lastPage = 1;

    do {
      const result: any = await authApiClient({
        endpoint: `/admin/roles?page=${page}`,
        method: "GET",
      });

      if (result?.status !== "success") {
        return result;
      }

      allRoles.push(...(Array.isArray(result.data) ? result.data : []));
      lastPage = result?.meta?.last_page ?? 1;
      page += 1;
    } while (page <= lastPage);

    return { status: "success", data: allRoles };
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function getRoleAction(id: number | string) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/roles/${id}`,
      method: "GET",
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function createRoleAction(data: { name: string }) {
  try {
    const result: any = await authApiClient({
      endpoint: "/admin/roles",
      method: "POST",
      body: data,
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function updateRoleAction(id: number | string, data: { name: string }) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/roles/${id}`,
      method: "PUT",
      body: data,
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function deleteRoleAction(id: number | string) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/roles/${id}`,
      method: "DELETE",
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

// Replaces the role's full permission set with the given list of permission names.
export async function assignPermissionsToRoleAction(
  id: number | string,
  permissions: string[]
) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/roles/${id}/assign`,
      method: "PUT",
      body: { permissions },
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}
