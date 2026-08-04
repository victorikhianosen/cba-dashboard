import { getAllBranchesAction } from "@/actions/branch.action";
import { getAllCurrenciesAction } from "@/actions/currency.action";
import { getVaultsAction } from "@/actions/vault.action";
import { requirePermission } from "@/lib/requirePermission";
import VaultManagement from "./components/VaultManagement";

export default async function VaultPage() {
  await requirePermission("view_vaults");

  const [vaultsResult, branchesResult, currenciesResult]: any[] = await Promise.all([
    getVaultsAction(1),
    getAllBranchesAction(),
    getAllCurrenciesAction(),
  ]);

  const vaults = Array.isArray(vaultsResult?.data) ? vaultsResult.data : [];
  const branches = Array.isArray(branchesResult?.data) ? branchesResult.data : [];
  const currencies = Array.isArray(currenciesResult?.data) ? currenciesResult.data : [];

  return (
    <VaultManagement
      initialVaults={vaults}
      initialMeta={vaultsResult?.meta ?? null}
      branches={branches}
      currencies={currencies}
    />
  );
}
