import { getAccountOfficersAction } from "@/actions/account-officer.action";
import { getAllBranchesAction } from "@/actions/branch.action";
import { getAllUsersAction } from "@/actions/user.action";
import { requirePermission } from "@/lib/requirePermission";
import AccountOfficerManagement from "./components/AccountOfficerManagement";

export default async function AccountOfficerPage() {
  await requirePermission("view_account_officers");

  const [result, branchesResult, usersResult]: [any, any, any] = await Promise.all([
    getAccountOfficersAction(1),
    getAllBranchesAction(),
    getAllUsersAction(),
  ]);

  const officers = Array.isArray(result?.data) ? result.data : [];
  const branches = Array.isArray(branchesResult?.data) ? branchesResult.data : [];
  const users = Array.isArray(usersResult?.data) ? usersResult.data : [];

  return (
    <AccountOfficerManagement
      initialOfficers={officers}
      initialMeta={result?.meta ?? null}
      branches={branches}
      users={users}
    />
  );
}
