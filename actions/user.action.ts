"use server";

import { authApiClient } from "@/lib/api-client";

export async function getUsersAction(page: number = 1) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/users?page=${page}`,
      method: "GET",
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

// Fetches every user across all pages, useful for populating dropdowns.
export async function getAllUsersAction() {
  try {
    const allUsers: any[] = [];
    let page = 1;
    let lastPage = 1;

    do {
      const result: any = await authApiClient({
        endpoint: `/admin/users?page=${page}`,
        method: "GET",
      });

      if (result?.status !== "success") {
        return result;
      }

      allUsers.push(...(Array.isArray(result.data) ? result.data : []));
      lastPage = result?.meta?.last_page ?? 1;
      page += 1;
    } while (page <= lastPage);

    // Pages can shift while paginating (a record created/edited between
    // fetches), so the same id may show up on two pages — dedupe it.
    const uniqueUsers = Array.from(new Map(allUsers.map((item) => [item.id, item])).values());

    return { status: "success", data: uniqueUsers };
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function getUserAction(id: number | string) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/users/${id}`,
      method: "GET",
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function createUserAction(data: {
  branch_id: number | string;
  staff_code: string;
  first_name: string;
  last_name: string;
  email: string;
  gender: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
}) {
  try {
    const result: any = await authApiClient({
      endpoint: "/admin/users",
      method: "POST",
      body: data,
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function updateUserAction(
  id: number | string,
  data: {
    branch_id: number | string;
    staff_code: string;
    first_name: string;
    last_name: string;
    username: string;
    email: string;
    gender: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    country: string;
  }
) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/users/${id}`,
      method: "PUT",
      body: data,
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function resetUserPasswordAction(id: number | string) {
  try {
    return await authApiClient({
      endpoint: `/admin/users/${id}/reset-password`,
      method: "POST",
    });
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function updateUserStatusAction(id: number | string, status: string) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/users/${id}/status`,
      method: "POST",
      body: { status },
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function assignUserRolesAction(id: number | string, roles: string[]) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/users/${id}/roles`,
      method: "POST",
      body: { roles },
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function unassignUserRolesAction(id: number | string, roles: string[]) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/users/${id}/roles`,
      method: "DELETE",
      body: { roles },
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}
