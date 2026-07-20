import {
  getAllPermissionsAction,
  getPermissionsAction,
} from "@/actions/permission.action";
import { requirePermission } from "@/lib/requirePermission";
import PermissionManagement from "./components/PermissionManagement";

export default async function PermissionPage() {
  await requirePermission("view_permissions");

  // The grouped UI needs every permission at once (to bucket by resource),
  // while the summary cards rely on page-1 meta for assigned/unassigned counts.
  const [allResult, summaryResult]: any[] = await Promise.all([
    getAllPermissionsAction(),
    getPermissionsAction(1),
  ]);

  const permissions = Array.isArray(allResult?.data) ? allResult.data : [];

  return (
    <PermissionManagement
      initialPermissions={permissions}
      initialMeta={summaryResult?.meta ?? null}
    />
  );
}
