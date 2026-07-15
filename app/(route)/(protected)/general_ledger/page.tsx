import { getAllCurrenciesAction } from "@/actions/currency.action";
import { getGeneralLedgersAction, getAllGeneralLedgersAction } from "@/actions/general-ledger.action";
import { requirePermission } from "@/lib/requirePermission";
import GeneralLedgerManagement from "./components/GeneralLedgerManagement";

export default async function ChartOfAccountsPage() {
  await requirePermission("view_general_ledgers");

  const [result, allLedgersResult, currenciesResult]: [any, any, any] = await Promise.all([
    getGeneralLedgersAction(1),
    getAllGeneralLedgersAction(),
    getAllCurrenciesAction(),
  ]);

  const ledgers = Array.isArray(result?.data) ? result.data : [];
  const allLedgers = Array.isArray(allLedgersResult?.data) ? allLedgersResult.data : [];
  const currencies = Array.isArray(currenciesResult?.data) ? currenciesResult.data : [];

  return (
    <GeneralLedgerManagement
      initialLedgers={ledgers}
      initialMeta={result?.meta ?? null}
      allLedgers={allLedgers}
      currencies={currencies}
    />
  );
}
