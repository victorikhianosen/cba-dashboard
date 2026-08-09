import { getVirtualAccountsAction } from "@/actions/virtual-account.action";
import { requirePermission } from "@/lib/requirePermission";
import VirtualAccountManagement from "./components/VirtualAccountManagement";

export default async function VirtualAccountsPage() {
  await requirePermission("view_virtual_accounts");

  const result: any = await getVirtualAccountsAction(1);
  const virtualAccounts = Array.isArray(result?.data) ? result.data : [];
  const meta = result?.meta ?? null;

  return (
    <VirtualAccountManagement
      initialVirtualAccounts={virtualAccounts}
      initialMeta={meta}
    />
  );
}
