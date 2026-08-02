import { getAllCurrenciesAction } from "@/actions/currency.action";
import { getAllGeneralLedgersAction } from "@/actions/general-ledger.action";
import { getInvestmentProductsAction } from "@/actions/investment-product.action";
import { requirePermission } from "@/lib/requirePermission";
import InvestmentProductManagement from "./components/InvestmentProductManagement";

export default async function InvestmentProductPage() {
  await requirePermission("view_investment_products");

  const [productsResult, currenciesResult, ledgersResult]: any[] = await Promise.all([
    getInvestmentProductsAction(1),
    getAllCurrenciesAction(),
    getAllGeneralLedgersAction(),
  ]);

  const investmentProducts = Array.isArray(productsResult?.data) ? productsResult.data : [];
  const currencies = Array.isArray(currenciesResult?.data) ? currenciesResult.data : [];
  const generalLedgers = Array.isArray(ledgersResult?.data) ? ledgersResult.data : [];

  return (
    <InvestmentProductManagement
      initialInvestmentProducts={investmentProducts}
      initialMeta={productsResult?.meta ?? null}
      currencies={currencies}
      generalLedgers={generalLedgers}
    />
  );
}
