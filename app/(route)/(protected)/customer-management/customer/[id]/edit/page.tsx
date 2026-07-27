import { notFound } from "next/navigation";
import { getAllAccountOfficersAction } from "@/actions/account-officer.action";
import { getAllBranchesAction } from "@/actions/branch.action";
import { getCustomerAction } from "@/actions/customer.action";
import { flattenCustomer } from "@/lib/customer";
import { requirePermission } from "@/lib/requirePermission";
import EditCustomerPage from "./components/EditCustomerPage";

interface CustomerEditPageProps {
  params: Promise<{ id: string }>;
}

export default async function CustomerEditPage({ params }: CustomerEditPageProps) {
  await requirePermission("update_customers");

  const { id } = await params;

  const [customerResult, branchesResult, officersResult]: [any, any, any] = await Promise.all([
    getCustomerAction(id),
    getAllBranchesAction(),
    getAllAccountOfficersAction(),
  ]);

  if (customerResult?.status !== "success" || !customerResult?.data) {
    notFound();
  }

  const branches = Array.isArray(branchesResult?.data) ? branchesResult.data : [];
  const accountOfficers = Array.isArray(officersResult?.data) ? officersResult.data : [];

  return (
    <EditCustomerPage
      customer={flattenCustomer(customerResult.data)}
      branches={branches}
      accountOfficers={accountOfficers}
    />
  );
}
