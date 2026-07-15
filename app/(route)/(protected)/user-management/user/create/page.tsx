import { getAllBranchesAction } from "@/actions/branch.action";
import { requirePermission } from "@/lib/requirePermission";
import CreateUserPage from "./components/CreateUserPage";

export default async function UserCreatePage() {
  await requirePermission("create_users");

  const branchesResult: any = await getAllBranchesAction();
  const branches = Array.isArray(branchesResult?.data) ? branchesResult.data : [];

  return <CreateUserPage branches={branches} />;
}
