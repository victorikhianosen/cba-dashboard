import { notFound } from "next/navigation";
import { getAllAccountProductsAction } from "@/actions/account-product.action";
import { getAllAccountTiersAction } from "@/actions/account-tier.action";
import { getCustomerAction } from "@/actions/customer.action";
import { getAllStatusesAction } from "@/actions/status.action";
import { flattenCustomer } from "@/lib/customer";
import { requirePermission } from "@/lib/requirePermission";
import CustomerDetail from "./components/CustomerDetail";

interface CustomerDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function CustomerDetailPage({ params }: CustomerDetailPageProps) {
  await requirePermission("view_customers");

  const { id } = await params;

  const [customerResult, accountProductsResult, accountTiersResult, statusesResult]: [
    any,
    any,
    any,
    any,
  ] = await Promise.all([
    getCustomerAction(id),
    getAllAccountProductsAction(),
    getAllAccountTiersAction(),
    getAllStatusesAction(),
  ]);

  if (customerResult?.status !== "success" || !customerResult?.data) {
    notFound();
  }

  const accountProducts = Array.isArray(accountProductsResult?.data)
    ? accountProductsResult.data
    : [];
  const accountTiers = Array.isArray(accountTiersResult?.data) ? accountTiersResult.data : [];
  const statuses = Array.isArray(statusesResult?.data) ? statusesResult.data : [];

  return (
    <CustomerDetail
      customer={flattenCustomer(customerResult.data)}
      accountProducts={accountProducts}
      accountTiers={accountTiers}
      statuses={statuses}
    />
  );
}
