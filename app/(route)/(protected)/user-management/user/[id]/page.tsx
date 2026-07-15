import { notFound } from "next/navigation";
import { getAllBranchesAction } from "@/actions/branch.action";
import { getAllRolesAction } from "@/actions/role.action";
import { getUserAction } from "@/actions/user.action";
import { requirePermission } from "@/lib/requirePermission";
import UserDetail from "./components/UserDetail";

interface UserDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function UserDetailPage({ params }: UserDetailPageProps) {
  await requirePermission("view_users");

  const { id } = await params;

  const [userResult, branchesResult, rolesResult]: any = await Promise.all([
    getUserAction(id),
    getAllBranchesAction(),
    getAllRolesAction(),
  ]);

  if (userResult?.status !== "success" || !userResult?.data) {
    notFound();
  }

  const branches = Array.isArray(branchesResult?.data) ? branchesResult.data : [];
  const allRoles = Array.isArray(rolesResult?.data) ? rolesResult.data : [];

  return (
    <UserDetail
      user={userResult.data}
      branches={branches}
      allRoles={allRoles}
    />
  );
}
