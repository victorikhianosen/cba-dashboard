import { notFound } from "next/navigation";
import { getCurrentUserCached } from "./current-user";

// Server-side page guard: if the current user lacks the required permission,
// render the segment's not-found.tsx instead of the page — mirrors the
// sidebar's visibility rule so a hidden link can't be reached by URL either.
export async function requirePermission(required: string | string[]) {
  const currentUser = await getCurrentUserCached();
  const permissions: string[] = Array.isArray(currentUser?.permissions)
    ? currentUser.permissions
    : [];

  const requiredList = Array.isArray(required) ? required : [required];
  const allowed = requiredList.some((permission) => permissions.includes(permission));

  if (!allowed) {
    notFound();
  }

  return currentUser;
}
