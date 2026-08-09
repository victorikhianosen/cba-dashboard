"use server";

import { authApiClient } from "@/lib/api-client";

// Lists sessions (login → logout/timeout), most recent first.
export async function getUserJourneySessionsAction(
  page: number = 1,
  search: string = "",
) {
  const params = new URLSearchParams({ page: String(page) });

  if (search.trim()) {
    params.set("search", search.trim());
  }

  const result: any = await authApiClient({
    endpoint: `/admin/user-journeys?${params.toString()}`,
    method: "GET",
  });

  return result;
}

// The full chronological timeline for one session.
export async function getUserJourneyTimelineAction(sessionId: number | string) {
  const result: any = await authApiClient({
    endpoint: `/admin/user-journeys/${sessionId}`,
    method: "GET",
  });

  return result;
}
