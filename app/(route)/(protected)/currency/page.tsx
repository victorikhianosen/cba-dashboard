import { getCurrenciesAction } from "@/actions/currency.action";
import { requirePermission } from "@/lib/requirePermission";
import CurrencyManagement from "./components/CurrencyManagement";

export default async function CurrencyPage() {
  await requirePermission("view_currencies");

  const result: any = await getCurrenciesAction(1);
  const currencies = Array.isArray(result?.data) ? result.data : [];

  return (
    <CurrencyManagement
      initialCurrencies={currencies}
      initialMeta={result?.meta ?? null}
    />
  );
}
