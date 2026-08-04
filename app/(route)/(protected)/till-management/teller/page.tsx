import { getAllBranchesAction } from "@/actions/branch.action";
import { getAllCurrenciesAction } from "@/actions/currency.action";
import { getTellersAction } from "@/actions/teller.action";
import { getAllVaultsAction } from "@/actions/vault.action";
import { getAllUsersAction } from "@/actions/user.action";
import { requirePermission } from "@/lib/requirePermission";
import TellerManagement from "./components/TellerManagement";

export default async function TellerPage() {
  await requirePermission("view_tellers");

  const [tellersResult, branchesResult, vaultsResult, currenciesResult, usersResult]: any[] =
    await Promise.all([
      getTellersAction(1),
      getAllBranchesAction(),
      getAllVaultsAction(),
      getAllCurrenciesAction(),
      getAllUsersAction(),
    ]);

  const tellers = Array.isArray(tellersResult?.data) ? tellersResult.data : [];
  const branches = Array.isArray(branchesResult?.data) ? branchesResult.data : [];
  const vaults = Array.isArray(vaultsResult?.data) ? vaultsResult.data : [];
  const currencies = Array.isArray(currenciesResult?.data) ? currenciesResult.data : [];
  const users = Array.isArray(usersResult?.data) ? usersResult.data : [];

  return (
    <TellerManagement
      initialTellers={tellers}
      initialMeta={tellersResult?.meta ?? null}
      branches={branches}
      vaults={vaults}
      currencies={currencies}
      users={users}
    />
  );
}
