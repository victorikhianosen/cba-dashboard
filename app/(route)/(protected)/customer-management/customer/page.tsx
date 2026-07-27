import { getAllBranchesAction } from "@/actions/branch.action";
import { getCustomersAction } from "@/actions/customer.action";
import { requirePermission } from "@/lib/requirePermission";
import CustomerManagement from "./components/CustomerManagement";

export default async function CustomerPage() {
  await requirePermission("view_customers");

  const [result, branchesResult]: [any, any] = await Promise.all([
    getCustomersAction(1),
    getAllBranchesAction(),
  ]);

  const customers = Array.isArray(result?.data) ? result.data : [];
  const branches = Array.isArray(branchesResult?.data) ? branchesResult.data : [];

  return (
    <CustomerManagement
      initialCustomers={customers}
      initialMeta={result?.meta ?? null}
      branches={branches}
    />
  );
}
