import { getPermissionsAction } from "@/actions/permission.action";
import { requirePermission } from "@/lib/requirePermission";
import PermissionManagement from "./components/PermissionManagement";

export default async function PermissionPage() {
  await requirePermission("view_permissions");

  const result: any = await getPermissionsAction(1);
  const permissions = Array.isArray(result?.data) ? result.data : [];

  return (
    <PermissionManagement
      initialPermissions={permissions}
      initialMeta={result?.meta ?? null}
    />
  );
}
