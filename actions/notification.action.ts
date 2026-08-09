"use server";

import { authApiClient } from "@/lib/api-client";

// Only ever called once on load/reconnect to hydrate the bell dropdown — every update
// after that arrives live over the user's own private Reverb channel, never polled.
export async function getNotificationsAction(page: number = 1) {
  const result: any = await authApiClient({
    endpoint: `/admin/notifications?page=${page}`,
    method: "GET",
  });

  return result;
}

export async function markNotificationAsReadAction(id: string) {
  const result: any = await authApiClient({
    endpoint: `/admin/notifications/${id}/read`,
    method: "POST",
  });

  return result;
}

export async function markAllNotificationsAsReadAction() {
  const result: any = await authApiClient({
    endpoint: `/admin/notifications/read-all`,
    method: "POST",
  });

  return result;
}
