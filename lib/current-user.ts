import { cache } from "react";
import { getCurrentUserAction } from "@/actions/auth.action";

// React's cache() memoizes this per server request, so the layout and a
// page under it (both calling this) only hit /admin/auth/me once, not twice.
export const getCurrentUserCached = cache(async () => {
  const result: any = await getCurrentUserAction();
  return result?.status === "success" ? result.data : null;
});
