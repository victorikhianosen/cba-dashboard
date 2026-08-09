"use server";

import { authApiClient } from "@/lib/api-client";

// Only the current (live) schedule version — small and unpaginated. See
// InvestmentService::currentScheduleFor().
export async function getInvestmentScheduleAction(
  investmentId: number | string,
) {
  const result: any = await authApiClient({
    endpoint: `/admin/investments/${investmentId}/schedule`,
    method: "GET",
  });

  return result;
}

// Every schedule version older than the current one — deliberately a separate, lazy call
// so a heavily topped-up investment doesn't download its whole history on every page load.
// Only fetched when the "Previous Schedules" section is actually expanded.
export async function getPreviousInvestmentScheduleAction(
  investmentId: number | string,
  page: number = 1,
) {
  const result: any = await authApiClient({
    endpoint: `/admin/investments/${investmentId}/schedule/previous?page=${page}`,
    method: "GET",
  });

  return result;
}
