import { getAllAccountOfficersAction } from "@/actions/account-officer.action";
import { getAllBranchesAction } from "@/actions/branch.action";
import { requirePermission } from "@/lib/requirePermission";
import CreateCustomerPage from "./components/CreateCustomerPage";

export default async function CustomerCreatePage() {
  await requirePermission("create_customers");

  const [branchesResult, officersResult]: [any, any] = await Promise.all([
    getAllBranchesAction(),
    getAllAccountOfficersAction(),
  ]);

  const branches = Array.isArray(branchesResult?.data) ? branchesResult.data : [];
  const accountOfficers = Array.isArray(officersResult?.data) ? officersResult.data : [];

  return <CreateCustomerPage branches={branches} accountOfficers={accountOfficers} />;
}
