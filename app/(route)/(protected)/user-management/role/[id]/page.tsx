import { notFound } from "next/navigation";
import { getAllPermissionsAction } from "@/actions/permission.action";
import { getRoleAction } from "@/actions/role.action";
import { requirePermission } from "@/lib/requirePermission";
import RoleDetail from "./components/RoleDetail";

interface RoleDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function RoleDetailPage({ params }: RoleDetailPageProps) {
  await requirePermission("view_roles");

  const { id } = await params;

  const [roleResult, permissionsResult]: any = await Promise.all([
    getRoleAction(id),
    getAllPermissionsAction(),
  ]);

  if (roleResult?.status !== "success" || !roleResult?.data) {
    notFound();
  }

  const allPermissions = Array.isArray(permissionsResult?.data)
    ? permissionsResult.data
    : [];

  return (
    <RoleDetail
      role={roleResult.data}
      allPermissions={allPermissions}
    />
  );
}
