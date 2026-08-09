"use server";

import { authApiClient } from "@/lib/api-client";

export async function getBranchesAction(page: number = 1, search: string = "") {
  const params = new URLSearchParams({ page: String(page) });

  if (search.trim()) {
    params.set("search", search.trim());
  }

  const result: any = await authApiClient({
    endpoint: `/admin/branches?${params.toString()}`,
    method: "GET",
  });

  return result;
}

// Fetches every branch across all pages, useful for populating dropdowns.
export async function getAllBranchesAction() {
  const allBranches: any[] = [];
  let page = 1;
  let lastPage = 1;

  do {
    const result: any = await authApiClient({
      endpoint: `/admin/branches?page=${page}`,
      method: "GET",
    });

    if (result?.status !== "success") {
      return result;
    }

    allBranches.push(...(Array.isArray(result.data) ? result.data : []));
    lastPage = result?.meta?.last_page ?? 1;
    page += 1;
  } while (page <= lastPage);

  // Pages can shift while paginating (a record created/edited between
  // fetches), so the same id may show up on two pages — dedupe it.
  const uniqueBranches = Array.from(
    new Map(allBranches.map((item) => [item.id, item])).values(),
  );

  return { status: "success", data: uniqueBranches };
}

export async function getBranchAction(id: number | string) {
  const result: any = await authApiClient({
    endpoint: `/admin/branches/${id}`,
    method: "GET",
  });

  return result;
}

export async function createBranchAction(data: {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
}) {
  const result: any = await authApiClient({
    endpoint: "/admin/branches",
    method: "POST",
    body: data,
  });

  return result;
}

export async function updateBranchAction(
  id: number | string,
  data: {
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    country: string;
    status: string;
  },
) {
  const result: any = await authApiClient({
    endpoint: `/admin/branches/${id}`,
    method: "PUT",
    body: data,
  });

  return result;
}

export async function updateBranchStatusAction(
  id: number | string,
  status: string,
) {
  const result: any = await authApiClient({
    endpoint: `/admin/branches/${id}/status`,
    method: "POST",
    body: { status },
  });

  return result;
}
