"use server";

import { authApiClient } from "@/lib/api-client";

export async function getRolesAction(page: number = 1, search: string = "") {
  const params = new URLSearchParams({ page: String(page) });

  if (search.trim()) {
    params.set("search", search.trim());
  }

  const result: any = await authApiClient({
    endpoint: `/admin/roles?${params.toString()}`,
    method: "GET",
  });

  return result;
}

// Fetches every role across all pages, used to render the full role
// checklist on the user detail page.
export async function getAllRolesAction() {
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

  // Pages can shift while paginating (a record created/edited between
  // fetches), so the same id may show up on two pages — dedupe it.
  const uniqueRoles = Array.from(
    new Map(allRoles.map((item) => [item.id, item])).values(),
  );

  return { status: "success", data: uniqueRoles };
}

export async function getRoleAction(id: number | string) {
  const result: any = await authApiClient({
    endpoint: `/admin/roles/${id}`,
    method: "GET",
  });

  return result;
}

export async function createRoleAction(data: { name: string }) {
  const result: any = await authApiClient({
    endpoint: "/admin/roles",
    method: "POST",
    body: data,
  });

  return result;
}

export async function updateRoleAction(
  id: number | string,
  data: { name: string },
) {
  const result: any = await authApiClient({
    endpoint: `/admin/roles/${id}`,
    method: "PUT",
    body: data,
  });

  return result;
}

export async function deleteRoleAction(id: number | string) {
  const result: any = await authApiClient({
    endpoint: `/admin/roles/${id}`,
    method: "DELETE",
  });

  return result;
}

// Replaces the role's full permission set with the given list of permission names.
export async function assignPermissionsToRoleAction(
  id: number | string,
  permissions: string[],
) {
  const result: any = await authApiClient({
    endpoint: `/admin/roles/${id}/assign`,
    method: "PUT",
    body: { permissions },
  });

  return result;
}
