import { getAllBranchesAction } from "@/actions/branch.action";
import { getUsersAction } from "@/actions/user.action";
import { requirePermission } from "@/lib/requirePermission";
import UserManagement from "./components/UserManagement";

export default async function UserPage() {
  await requirePermission("view_users");

  const [result, branchesResult]: [any, any] = await Promise.all([
    getUsersAction(1),
    getAllBranchesAction(),
  ]);

  const users = Array.isArray(result?.data) ? result.data : [];
  const branches = Array.isArray(branchesResult?.data) ? branchesResult.data : [];

  return (
    <UserManagement
      initialUsers={users}
      initialMeta={result?.meta ?? null}
      branches={branches}
    />
  );
}
