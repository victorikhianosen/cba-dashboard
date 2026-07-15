import { getRolesAction } from "@/actions/role.action";
import { requirePermission } from "@/lib/requirePermission";
import RoleManagement from "./components/RoleManagement";

export default async function RolePage() {
  await requirePermission("view_roles");

  const result: any = await getRolesAction(1);
  const roles = Array.isArray(result?.data) ? result.data : [];

  return (
    <RoleManagement
      initialRoles={roles}
      initialMeta={result?.meta ?? null}
    />
  );
}
