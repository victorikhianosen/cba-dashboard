import { getAccountsAction } from "@/actions/account.action";
import { requirePermission } from "@/lib/requirePermission";
import AccountManagement from "./components/AccountManagement";

export default async function AccountPage() {
  await requirePermission("view_accounts");

  const result: any = await getAccountsAction(1);

  const accounts = Array.isArray(result?.data) ? result.data : [];

  return <AccountManagement initialAccounts={accounts} initialMeta={result?.meta ?? null} />;
}
