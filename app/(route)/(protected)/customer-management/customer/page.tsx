import { getCustomersAction } from "@/actions/customer.action";
import { requirePermission } from "@/lib/requirePermission";
import CustomerManagement from "./components/CustomerManagement";

export default async function CustomerPage() {
  await requirePermission("view_customers");

  const result: any = await getCustomersAction(1);
  const customers = Array.isArray(result?.data) ? result.data : [];

  return <CustomerManagement initialCustomers={customers} initialMeta={result?.meta ?? null} />;
}
